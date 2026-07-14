# Implementation Plan: Unified AI Provider

Ordered checklist. All paths relative to repo root. Backend package: `packages/backend/server`.

## Phase 1 — backend core

- [x] 1. `src/plugins/copilot/providers/types.ts`: add `OpenAICompatible = 'openaiCompatible'` to `CopilotProviderType`.
- [x] 2. `src/plugins/copilot/config.ts`:
  - `OpenAICompatibleConfig` type; add to `CopilotProviderConfigMap`
  - `OpenAICompatibleConfigShape` zod + arm in `CopilotProviderProfileShape`
  - `AppConfigSchema` → `providers.openaiCompatible: ConfigItem<OpenAICompatibleConfig>`
  - `defineModuleConfig` entry with default `{apiKey:'', baseURL:'', defaultModel:''}`
- [x] 3. `src/plugins/copilot/providers/provider-model-runtime.ts`: `checkProviderParams` input gains optional `resolveModel` callback; use in place of `requireProviderModelSelection`.
- [x] 4. `src/plugins/copilot/providers/provider.ts`: `createDriverSpec` uses `this.checkParams.bind(this)` / `this.selectModel.bind(this)`.
- [x] 5. New `src/plugins/copilot/providers/openai-compatible.ts`: `OpenAICompatibleProvider extends OpenAIProvider` per design §1.
- [x] 6. `src/plugins/copilot/providers/provider-registry.ts`: `OpenAICompatible` first in `LEGACY_PROVIDER_ORDER`.
- [x] 7. `src/plugins/copilot/providers/provider-tokens.ts` + `providers/index.ts`: register/export.

## Phase 2 — picker & session policy

- [x] 8. `src/plugins/copilot/resolver.ts` `models()`: takeover branch returning dynamic list (design §7).
- [x] 9. `src/plugins/copilot/runtime/model-selection-policy.ts`: takeover pass-through (design §8).

## Phase 3 — admin UI

- [x] 10. `packages/frontend/admin/src/modules/settings/config.ts`: add `'providers.openaiCompatible'` to AI group.

## Phase 4 — validation

- [x] 11. `yarn workspace @affine/server build` (rspack bundle must pass).
- [x] 12. Targeted typecheck of changed backend files (tsc via build is sufficient; run `yarn affine @affine/admin build` for the admin change).
- [x] 13. Grep audit: no remaining code path where takeover-configured requests can reach `NoCopilotProviderAvailable` for text/object/structured.

## Phase 5 — deploy to test env (remote build, per user's standing requirement: no registry pulls)

- [x] 14. Sync changed files to `ubuntu@192.168.122.34:/home/ubuntu/AFFiNE` (scp via jump host `root@103.217.203.235`), commit snapshot in remote git.
- [x] 15. Remote: rebuild server dist + admin dist; docker build new tag `remote-built-<newsha>`; update `/home/ubuntu/affine/.env` AFFINE_REVISION; `docker compose up -d`.
- [x] 16. Configure via admin GraphQL/DB: `copilot.providers.openaiCompatible = {apiKey: <user's key>, baseURL: 'https://hk.getelucid.com', defaultModel: <ask user or pick from /v1/models>}`.
- [x] 17. Live verify: picker lists proxy models; chat round-trip OK; translate/summarize action OK.

## Rollback points

- Any phase: `git checkout -- <files>` locally; remote rollback = restore `.env` backup + `docker compose up -d` with previous tag (`remote-built-696e08024` still on the host).

## Validation commands

```bash
yarn workspace @affine/server build
yarn affine @affine/admin build
node -e "..."  # ad-hoc: hit /graphql models(promptName:"Chat With AFFiNE AI") after deploy
curl -s http://103.217.203.235:3010/api/... # live smoke via chat SSE
```
