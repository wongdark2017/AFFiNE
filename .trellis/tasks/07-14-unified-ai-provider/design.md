# Design: Unified AI Provider

## Key architectural insight

The Rust native execution engine does NOT consult the model catalog at request time. It receives `{protocol, backendConfig{base_url, auth_token}, model: string, messages}` built entirely in TS (`provider-runtime-contract.ts:compileProviderChatDriver.prepare()`). The static catalog (`llm_adapter`) is consulted only in the TS layer via three overridable seams:

1. `CopilotProvider.match()` → `configured() && matchProviderModelHelper(...)` (provider.ts:195)
2. `selectModel` / `checkParams` closures inside `CopilotProvider.createDriverSpec()` (provider.ts:85-107) — these duplicate the public `this.selectModel` / `this.checkParams` methods verbatim.
3. `resolveModel()` for display names (provider.ts:205).

Therefore the whole "去静态表" change is a TS-layer provider subclass that (a) matches any model id, (b) builds a **synthetic `ResolvedProviderModel`** (protocol `openai_chat`, conservative capabilities) instead of a native registry lookup, and (c) dynamically fetches `/v1/models`. The native engine happily executes the synthetic route.

## Components

### 1. `OpenAICompatibleProvider` (new file `providers/openai-compatible.ts`)

Extends `OpenAIProvider` (reuses its native driver spec: chat/structured HTTP handling, error mapping, attachment prep).

- `type = CopilotProviderType.OpenAICompatible` (new enum value `'openaiCompatible'` in providers/types.ts)
- Config: `{ apiKey: string; baseURL: string; defaultModel: string; reasoningSupported?: boolean }`
- `configured()` → `!!apiKey && !!baseURL && !!defaultModel`
- `resolveModelBackendKind()` → `'openai_chat'` (classic `/v1/chat/completions`; universal for relays)
- `match(cond)` → `configured() && outputType ∈ {undefined, Text, Object, Structured}`. **No catalog lookup.**
- `pickModelId(cond)`: requested id ∈ cached dynamic list → pass through as-is; otherwise → `defaultModel`. (So built-in.json's hard-coded `gemini-2.5-flash` funnels to `defaultModel`, while picker-chosen ids pass through raw.)
- `buildModel(id)` → synthetic `ResolvedProviderModel`: `protocol: 'openai_chat'`, `capabilities: [{input: [Text, Image], output: [Text, Object, Structured], attachments: {kinds:['image'], allowRemoteUrls: false}, defaultForOutputType: true}]`, `behaviorFlags: config.reasoningSupported ? ['reasoning_supported'] : []`.
- `selectModel()` / `resolveModel()` overrides → synthetic path.
- `checkParams()` override → delegates to `checkProviderParams` with a custom `resolveModel` callback (see §3).
- `listModels(execution)`: `GET {base}/v1/models` (`base` = baseURL with trailing `/v1` stripped, same normalization as `createNativeConfig`), `Authorization: Bearer`, 10s timeout; parse `{data:[{id}]}`; per-providerId cache with 5-min TTL + in-flight dedupe; on failure log warn + return last cache (or []). Fire-and-forget refresh kicked from `match()` so the cache is warm by the time `selectModel` (sync) runs.

### 2. Overridability refactor (`providers/provider.ts`)

`createDriverSpec()` currently inlines `checkProviderParams(...)` / `requireProviderModelSelection(...)` closures identical to the public `checkParams` / `selectModel` methods. Change the closures to `this.checkParams.bind(this)` / `this.selectModel.bind(this)` — behavior-preserving for all existing providers, makes subclass overrides effective inside the native driver pipeline.

### 3. `checkProviderParams` seam (`providers/provider-model-runtime.ts`)

Add optional `resolveModel?: (cond: ModelFullConditions) => CopilotProviderModel` to the input object; use it instead of `requireProviderModelSelection` when provided (~6 lines). Message zod validation and condition inference stay shared.

### 4. Registry priority (`providers/provider-registry.ts`)

Add `CopilotProviderType.OpenAICompatible` at **index 0** of `LEGACY_PROVIDER_ORDER` → highest legacy priority. When configured it wins every model resolution (`registry.order` is priority-sorted, `resolveModel()` walks it in order); when not configured, `syncProvider` unregisters it and nothing changes.

### 5. Config plumbing (`config.ts`)

- `OpenAICompatibleConfig` in `CopilotProviderConfigMap`
- zod shape + `CopilotProviderProfileShape` discriminated-union arm
- `AppConfigSchema` declaration + `defineModuleConfig` entry `providers.openaiCompatible` (default `{apiKey:'', baseURL:'', defaultModel:''}`)

### 6. Registration

- `provider-tokens.ts`: add class to `CopilotProviders` (NestJS DI list consumed by module-providers.ts and lifecycle-service).
- `providers/index.ts`: export.

### 7. Dynamic picker list (`resolver.ts` `models()`)

After loading the prompt: resolve the no-model route (`resolveProvider({outputType: Text})`). If it lands on an `openaiCompatible` provider, return `{defaultModel: profile config defaultModel, optionalModels: (await listModels()).map(id => ({id, name: id})), proModels: []}` instead of converting the prompt's static `optionalModels`. Otherwise unchanged.

### 8. Session model-selection pass-through (`runtime/model-selection-policy.ts`)

`resolveRequestedModel` currently validates `requestedModelId` against the prompt's static `optionalModels` via native `llmResolveRequestedModelMatch`, silently falling back to the prompt default on mismatch — this would discard picker choices from the dynamic list. Add a takeover branch: if the registry contains an **enabled `openaiCompatible` profile with a non-empty apiKey** and `requestedModelId` is present, return `{selectedModel: requestedModelId, matchedOptionalModel: true}` directly. (Uses only the already-injected `CopilotProviderRegistryService` — no new DI edges. Pro-model payment gating is bypassed only when the self-host admin has explicitly configured takeover, which is acceptable.)

### 9. Admin UI (`packages/frontend/admin/src/modules/settings/config.ts`)

Add `'providers.openaiCompatible'` to the AI group fields (first position).

## Data flow after change (takeover configured)

```
chat request (model=gemini-2.5-flash or picker choice)
  → session policy: takeover branch honors requested id
  → factory.resolveRoutes → registry order: [openaiCompatible-default, ...] → match()=true
  → prepare chat: checkParams (custom resolveModel) → selectModel → pickModelId
      (unknown id → defaultModel; listed id → pass through)
  → synthetic model {protocol: openai_chat} → route {base_url, auth_token, model}
  → native engine → POST {baseURL}/v1/chat/completions
```

## Compatibility / rollback

- Not configured (`apiKey`/`baseURL`/`defaultModel` empty) → provider unregistered by lifecycle; registry entry filtered from candidates; resolver/policy branches inert. Existing behavior byte-identical except the two behavior-preserving refactors (§2, §3).
- Rollback = clear the config (no restart needed; `config.changed` re-syncs) or revert the commit.

## Risks

- **Capability metadata is synthetic**: image attachments are advertised; if the proxy model can't take images the proxy returns an error surfaced in chat (acceptable; override knob can be added later).
- **Reasoning/Extended-Thinking**: default off (`reasoning_supported` flag absent → native strips reasoning params). Opt-in via `reasoningSupported: true`.
- **`/v1/models` unavailable** on some relays → picker falls back to empty list but chat still works (everything routes to `defaultModel`).
