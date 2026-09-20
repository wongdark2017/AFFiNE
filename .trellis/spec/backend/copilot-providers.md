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

## Admin draft model discovery

### Scope

The admin AI form can discover models before saving a provider or choosing its default model. The endpoint is separate from workspace chat model selection and must not mutate provider configuration or its runtime cache.

### Signatures

- `POST /api/copilot/admin/models` in `CopilotAdminController`, protected by the default auth guard, `@Admin()` and strict throttling.
- Cookie sessions additionally require matching `affine_csrf_token` cookie and `x-affine-csrf-token` header, as sent by admin `affineFetch`. JWT exemption depends on `req.authType` set by AuthGuard, never the presence of an Authorization header alone.
- `fetchOpenAICompatibleModels(input: unknown): Promise<string[]>` in `providers/openai-compatible-models.ts`, also used by the runtime provider's cached discovery.

### Contracts

Input is `{ apiKey: string, baseURL: string }`; output is `{ models: string[] }`. `defaultModel` is not required. Normalize trailing slashes and optional `/v1`, retain proxy path prefixes and append `/v1/models`. Use Bearer authorization, a ten-second timeout and `redirect: 'error'`. The helper validates the upstream `{ data: [{ id: string }] }` response and returns nonempty unique model IDs.

`openAICompatibleBaseURL` is shared by discovery, connectivity probes and the compatible provider's production native config. Keep them consistent: `/proxy/v1///` must become the same `/proxy` native base and `/proxy/v1/*` HTTP endpoints. Recheck the shared deadline after reading/parsing the model response body.

### Validation and errors

Reject missing credentials, non-HTTP(S) URLs, URL userinfo, queries and fragments before fetching; local HTTP endpoints are supported. Upstream 401/403, 404, 429, timeout, connection and invalid response errors map to fixed safe messages through `ModelDiscoveryError` and project `BadRequest`. Never forward upstream bodies, request credentials or raw exception messages to users or logs.

### Good, base and bad cases

- Good: an administrator discovers models with unsaved credentials, then selects one using the existing configuration update flow.
- Base: an empty list is valid and the UI continues to support manual model IDs.
- Bad: unauthenticated/non-admin requests never contact the upstream; changing credentials invalidates older frontend requests.

### Tests

Helper tests cover URL normalization, headers, credentials validation, response shape, deduplication and safe failures. Controller tests use real AuthGuard/AdminGuard with mocked session lookup and feature checks, asserting 401/403 before fetch and sanitized results for administrators. These HTTP tests require the normal server native dependency to be built.

### Wrong vs correct

Wrong: save temporary credentials to query models, require a default model before discovery, or echo the upstream failure body.

Correct: query with a transient request body and a pure discovery helper, return safe results, and let the user explicitly save their chosen model.

## Admin connection test

### Scope

Test a configured OpenAI-compatible model with a small real chat request, not just a model-list lookup. The operation is transient and does not create messages or save provider configuration.

### Signatures

`POST /api/copilot/admin/test-connection` uses the same auth/admin/throttle protections. `testOpenAICompatibleConnection(input: unknown)` owns the probe; `openAICompatibleURL` owns common discovery/chat URL normalization.

### Contracts

Input `{apiKey, baseURL, defaultModel}` must contain nonempty strings. Output `{model, latencyMs}` identifies the requested model and total elapsed milliseconds without returning generated text. Send `Reply with OK.` to `/v1/chat/completions`, nonstreaming, with a 32-token completion budget. Match the native protocol with `max_completion_tokens`; retry once with `max_tokens` only for a recognized unsupported-parameter 400. Both attempts share a 20-second deadline, including body reads, and disallow redirects.

Structured upstream error fields take precedence over message matching: if `param` names another field or `code` indicates an invalid value, mentioning `max_completion_tokens` in the body must not trigger the fallback.

### Validation and errors

HTTP 200 alone is insufficient: require nonempty chat choices with an assistant message. A null content with `finish_reason: length` is valid for a reasoning model that consumed the small budget; arbitrary null content is invalid. Classify key rejection, unavailable/non-chat model, quota, rate limit, timeout, network and malformed replies with fixed safe messages. Never return upstream bodies or raw errors.

### Good, base and bad cases

Good: a manual model ID and unsaved endpoint can be tested before saving. Base: an older relay triggers a single bounded parameter fallback. Bad: a 401, 500 or ordinary 400 never triggers a retry; invalid input never sends credentials.

### Tests

Assert endpoint/body/authorization, total shared timeout and output limit, exact retry criteria and retry count, valid assistant result shape, sanitized failure mappings, and administrator gating. Frontend tests cover missing fields, pending/duplicate clicks, safe error/retry, success latency, credential/model changes and late/unmounted responses.

### Wrong vs correct

Wrong: mark any 200 as success, run unlimited retries, persist the draft, or retain a successful status after a model change.

Correct: verify the chat response, use a small bounded probe, and invalidate UI test status whenever the tested configuration changes.
