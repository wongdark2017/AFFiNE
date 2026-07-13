# Auth & Access Control

> Authentication is global-by-default; fine-grained authorization is explicit per-resolver.
> All of this lives in `packages/backend/server`.

---

## Authentication: secure by default

A single global `AuthGuard` (`src/core/auth/guard.ts`) is bound app-wide in
`src/server.ts` (`app.useGlobalGuards(app.get(AuthGuard), app.get(CloudThrottlerGuard))`).
**Every route requires a session unless decorated otherwise.** Unauthenticated access throws
`AuthenticationRequired`.

- `@Public()` — opts a handler/class out of the session requirement
  (`SetMetadata(PUBLIC_ENTRYPOINT_SYMBOL, true)`, defined at the bottom of `guard.ts`).
- `@Internal()` — marks internal entrypoints (same file).
- `@CurrentUser() user: CurrentUser` — param decorator (`src/core/auth/session.ts`) returning
  `req.session?.user ?? req.token?.user`. On `@Public()` routes type it optional
  (`user?: CurrentUser`).

Accepted credentials (see `resolveRequestSession` in the auth core): JWT bearer, legacy
session-id bearer, access-token bearer, and cookie session. Client version gating can throw
`UnsupportedClientVersion`.

## Admin-only surfaces

`@Admin()` (defined in `src/core/common/admin-guard.ts`) wraps `AdminGuard`, which checks
`feature.isAdmin(userId)` and throws `ActionForbidden` otherwise. Apply at class level:

```ts
// src/core/user/resolver.ts
@Admin()
@Resolver(() => UserType)
export class UserManagementResolver { ... }
```

## Workspace/doc authorization: explicit, in the method body

Fine-grained checks are NOT guards. Inject the fluent builder and assert inside the resolver:

```ts
constructor(private readonly ac: PermissionAccess) {}

// doc-level
await this.ac.user(user.id).doc(workspaceId, docId).assert('Doc.Publish');
// workspace-level
await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Read');
// non-throwing check
const allowed = await this.ac.user(user.id).doc(input).can('Doc.Users.Manage');
```

- `PermissionAccess` is the exported alias of `AccessControllerBuilder`
  (`src/core/permission/index.ts`); the builder delegates to `PermissionService`
  (`src/core/permission/service.ts`).
- On denial, `assert*` throws typed errors: `SpaceAccessDenied({ spaceId })` for workspaces,
  `DocActionDenied({ action, docId, spaceId })` for docs.
- Actions are typed strings (`DocAction`, workspace actions like `'Workspace.Read'`) — use
  existing action names; real usage throughout `src/core/workspaces/resolvers/doc.ts`.
- Importing modules add `PermissionModule` to their `@Module({ imports })` (see
  `src/core/user/index.ts`).

## Error style

Auth failures always throw `UserFriendlyError` subclasses from `../../base`:
`AuthenticationRequired`, `ActionForbidden`, `AccessDenied`, `SpaceAccessDenied`,
`DocActionDenied`. Never raw exceptions.

## Anti-patterns

- Forgetting that routes are auth-required by default — don't add manual "is logged in"
  checks; the global guard already did it, and `@CurrentUser()` is populated.
- Marking a route `@Public()` and then reading `user!` non-null — it can be undefined.
- Doing permission checks in a custom guard or middleware — the codebase does resource-level
  checks explicitly via `this.ac...assert(...)` in the method body.
- Returning `null`/`false` on denial instead of letting `assert` throw the typed error.
