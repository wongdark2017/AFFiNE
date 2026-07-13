# AFFiNE Spec Index

> Minimal, source-backed guidelines bootstrapped from the codebase on 2026-07-08.
> Every rule points at real files; extend this set only when a new pattern has actual code
> examples to back it.

## Layout

| Area     | Spec                                             | Covers                                                                                                       |
| -------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Backend  | [backend/api-routes.md](./backend/api-routes.md) | GraphQL resolvers, REST controllers, module wiring, error declaration (`packages/backend/server`)            |
| Backend  | [backend/auth.md](./backend/auth.md)             | Global `AuthGuard`, `@Public()`/`@Admin()`/`@CurrentUser()`, `PermissionAccess` workspace/doc checks         |
| Backend  | [backend/logging.md](./backend/logging.md)       | `new Logger(Class.name)` → `AFFiNELogger`, request-id tracing, what to log                                   |
| Backend  | [backend/testing.md](./backend/testing.md)       | AVA server tests, `createTestingModule` / `createTestingApp`                                                 |
| Frontend | [frontend/forms.md](./frontend/forms.md)         | Forms with `useState` + `useAsyncCallback`, `@affine/component` primitives, `GraphQLService.gql()` in stores |
| Testing  | [testing/index.md](./testing/index.md)           | Vitest unit/component tests, Playwright E2E via `@affine-test/kit`                                           |
| Guides   | [guides/index.md](./guides/index.md)             | General thinking guides (code reuse, cross-layer changes)                                                    |

## Scope notes

- The previous auto-generated per-package template tree (~80 directories of unfilled
  placeholders) was removed on 2026-07-08; a backup exists in the session scratchpad.
- Not yet specced (no dedicated doc, patterns exist in code): server jobs/EventBus handlers,
  frontend module/service structure (`packages/frontend/core/src/modules/*`), Rust/native
  packages, blocksuite editor internals. Add a spec only alongside a task that touches the
  area, following the source-backed style above.
