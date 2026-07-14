# Copilot Provider Routing

How AI model requests are routed to providers in `src/plugins/copilot/providers/`.

## Two routing regimes

1. **Catalog-gated (default)** — per-family providers (`openai`, `gemini`, `anthropic`, vertex variants, …). A model id is only routable if the **static model catalog** compiled into the Rust native module (`llm_adapter` crate, reached via `llmResolveModelRegistryVariant` in `provider-model-runtime.ts`) recognizes it for that provider's `backendKind`. Unknown ids → `NoCopilotProviderAvailable`.
2. **Takeover (`openaiCompatible`)** — the unified relay provider (`providers/openai-compatible.ts`). When configured (`apiKey` + `baseURL` + `defaultModel`), it sits **first** in `LEGACY_PROVIDER_ORDER` (`provider-registry.ts`) and accepts **any** model id for text/object/structured outputs, bypassing the native catalog with a synthetic `ResolvedProviderModel` (`protocol: 'openai_chat'`). Model list is fetched dynamically from `{baseURL}/v1/models` (5-min TTL cache).

## Key seams (extend here, not elsewhere)

- The native execution engine takes `{protocol, backendConfig, model: string}` assembled in TS — it never re-validates model ids. Catalog checks live ONLY in `CopilotProvider.match()` / `selectModel()` / `checkParams()`, all overridable per provider. `createDriverSpec` (provider.ts) binds `this.selectModel` / `this.checkParams`, so subclass overrides apply inside the native driver pipeline too.
- `checkProviderParams` (provider-model-runtime.ts) accepts an optional `resolveModel` callback for catalog-free providers.
- Requested-model validation at the session layer happens in `runtime/model-selection-policy.ts` (`resolveRequestedModel`): normally requested ids must match the prompt's `optionalModels` or they silently fall back to the prompt default. The takeover branch honors any requested id when an `openaiCompatible` profile is configured.
- The chat picker's list comes from `resolver.ts` `models(promptName)`: static `optionalModels` filtered by resolvability — or, in takeover mode, the dynamic `/v1/models` list.

## Adding a provider type — checklist

`CopilotProviderType` (types.ts) → config type + zod arm + `defineModuleConfig` (config.ts) → provider class → `CopilotProviders` (provider-tokens.ts) → `LEGACY_PROVIDER_ORDER` (provider-registry.ts) → **`DEFAULT_MIDDLEWARE_BY_TYPE` in provider-middleware.ts (exhaustive `Record`, compile error if missed)** → admin UI fields (`packages/frontend/admin/src/modules/settings/config.ts`).

## Gotchas

- `OpenAIProvider.type` is annotated `: CopilotProviderType` (not literal) so subclasses can override it.
- Providers register/unregister via `CopilotProviderLifecycleService` on `config.init`/`config.changed`; writing config directly to the DB does NOT emit `config.changed` — only the admin `updateAppConfig` mutation does (or restart).
- rspack bundling (`yarn workspace @affine/server build`) does not typecheck; run `tsc -p tsconfig.json --noEmit` for exhaustive-Record/enum errors.
