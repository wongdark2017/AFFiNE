# Backend Specs (`packages/backend/server`)

| Spec                             | Covers                                                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [api-routes.md](./api-routes.md) | Where endpoints go, GraphQL resolver & REST controller patterns, `UserFriendlyError` declaration flow |
| [auth.md](./auth.md)             | Global auth-by-default, `@Public()`/`@Admin()`/`@CurrentUser()`, `PermissionAccess` assertions        |
| [copilot-providers.md](./copilot-providers.md) | Copilot provider routing, static catalog vs `openaiCompatible` takeover, add-a-provider checklist |
| [logging.md](./logging.md)       | Per-class `Logger`, `AFFiNELogger` request-id tracing, log-vs-event rules                             |
| [testing.md](./testing.md)       | AVA test layout, `createTestingModule`/`createTestingApp`, mocks                                      |

Quick orientation: `src/core/*` (always-on features) · `src/plugins/*` (flavored features) ·
`src/base/*` (infra: errors, logger, guards, throttler) · `src/models/*` (data access) ·
`src/app.module.ts` (module registration).
