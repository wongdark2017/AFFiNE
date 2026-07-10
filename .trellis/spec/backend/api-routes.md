# API Routes (GraphQL & REST)

> How endpoints are actually added in `packages/backend/server`. NestJS; GraphQL is the
> primary API, REST controllers exist for auth, avatars, blobs, and similar byte/redirect flows.

---

## Where code goes

- First-party features → `src/core/<feature>/` with `resolver.ts` (or `resolvers/`),
  `controller.ts`, `service.ts`, and `index.ts` holding the `@Module`.
- Optional/flavored features (copilot, payment, oauth, indexer, license, worker, captcha…) →
  `src/plugins/<name>/`.
- Register the module in `src/app.module.ts` via `AppModuleBuilder.use(...)`, or
  `.useIf(() => env.flavors.graphql, ...)` when gated by a server flavor.
- Data access goes through injected `Models` / `*Model` classes from `src/models/` — direct
  `PrismaClient` injection in resolvers is deprecated (`@deprecated migrate to models`).

## GraphQL resolvers

Classes decorated `@Resolver(() => SomeType)` using `@nestjs/graphql` decorators
(`@Query`, `@Mutation`, `@ResolveField`, `@Args`; types via `@ObjectType`/`@InputType`/`@Field`).
Declared in the module's `providers` array alongside services (see
`src/core/user/index.ts`, `src/core/workspaces/index.ts`).

Reference: `src/core/user/resolver.ts`:

```ts
@Resolver(() => UserType)
export class UserResolver {
  constructor(
    private readonly storage: AvatarStorage,
    private readonly models: Models
  ) {}

  @Throttle('strict')
  @Query(() => UserOrLimitedUser, { name: 'user', nullable: true })
  @Public()
  async user(
    @Args('email') email: string,
    @CurrentUser() currentUser?: CurrentUser
  ) { ... }
}
```

A representative mutation (`src/core/workspaces/resolvers/doc.ts`, `publishDoc`) shows the
standard body shape: validate preconditions (log + throw typed error), assert permission via
`this.ac`, do the work through a model/service, emit a domain event on the `EventBus`
(`this.event.emit('doc.public_state.changed', {...})`), return the GraphQL type.

## REST controllers

Plain NestJS `@Controller` (~20 exist). Used when GraphQL doesn't fit: serving bytes,
redirects, webhook/auth endpoints.

```ts
// src/core/user/controller.ts
@Public()
@Controller('/api/avatars')
export class UserAvatarController {
  @Get('/:id')
  async getAvatar(@Res() res: Response, @Param('id') id: string) { ... }
}
```

Auth flows are REST and stack named guards + throttling
(`src/core/auth/controller.ts`):

```ts
@Public()
@UseNamedGuard('version', 'captcha')
@Post('/sign-in')
async signIn(...)
```

`@UseNamedGuard(...)` is the registry-based per-route guard mechanism from
`src/base/guard/guard.ts`. Rate limiting uses `@Throttle('strict' | 'default')` plus the
global `CloudThrottlerGuard`.

## Errors

Never `throw new Error(...)` or Nest's `ForbiddenException` for business errors — throw
`UserFriendlyError` subclasses imported from `../../base`.

To add a new error:

1. Add an entry to `USER_FRIENDLY_ERRORS` in `src/base/error/def.ts` — pick a base `type`
   (maps to HTTP status via `BaseTypeToHttpStatusMap`, e.g. `no_permission` → 403), declare
   typed `args`, write the `message`:

   ```ts
   image_format_not_supported: {
     type: 'invalid_input',
     args: { format: 'string' },
     message: ({ format }) => `Image format not supported: ${format}`,
   },
   ```

2. Run the server in dev — `ErrorModule.onModuleInit` regenerates
   `src/base/error/errors.gen.ts` (auto-generated file; never edit by hand).
3. `import { ImageFormatNotSupported } from '../../base'` and `throw new
ImageFormatNotSupported({ format })`.

The global `GlobalExceptionFilter` (registered in `src/server.ts`) converts thrown errors to
responses; CLS attaches the `X-Request-Id` to errors and logs.

## Anti-patterns

- Business logic or Prisma queries inline in resolvers — go through `src/models/` and services.
- Editing `errors.gen.ts` directly.
- Custom per-route auth logic instead of `@Public()` / `@Admin()` / `PermissionAccess`
  (see [auth.md](./auth.md)).
- Adding a REST endpoint for data that fits GraphQL — controllers are for bytes, redirects,
  and auth/webhook flows.
