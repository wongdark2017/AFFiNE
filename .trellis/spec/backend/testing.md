# Server Tests (AVA)

> `packages/backend/server` tests use **AVA** — not vitest, not jest. The root `yarn test`
> (vitest) does not run these.

---

## Layout & config

- Config: `packages/backend/server/ava.config.js` — files `**/*.spec.ts` and `**/*.e2e.ts`,
  TS as ESM, `NODE_ENV=test`, prelude `./src/prelude.ts`. `TEST_MODE=e2e` targets
  `src/__tests__/e2e/**/*.spec.ts`.
- Tests live in `src/__tests__/` grouped by domain (`auth/`, `doc/`, `workspace/`, `models/`,
  `copilot/`, `e2e/`, `nestjs/`), plus `src/models/__tests__/`. Shared helpers in
  `src/__tests__/utils/`, mocks in `src/__tests__/mocks/`, fixtures in
  `src/__tests__/__fixtures__/`.

## Two helpers, two test shapes

### 1. Service/model tests — `createTestingModule` (`utils/testing-module.ts`)

Typed AVA context + lifecycle hooks; `initTestingDB()` resets Postgres between tests.
Reference: `src/__tests__/models/doc.spec.ts`:

```ts
const test = ava as TestFn<Context>;

test.before(async t => {
  const module = await createTestingModule();
  t.context.doc = module.get(DocModel);
  t.context.module = module;
});

test.beforeEach(async t => {
  await t.context.module.initTestingDB();
  user = await t.context.user.create({ email: 'test@affine.pro' });
});

test.after(async t => {
  await t.context.module.close();
});

test('should create a batch updates on a doc', async t => {
  t.is(updates.count, 2);
});
```

### 2. HTTP/GraphQL integration tests — `createTestingApp` (`utils/testing-app.ts`)

Boots a full Nest app with supertest, `GlobalExceptionFilter`, cookie parser, upload
middleware, and `AFFiNELogger`. Tests may declare in-file test controllers/resolvers and pass
them via the module metadata (see `src/__tests__/nestjs/error-handler.spec.ts`, which defines
a `@Public() @Resolver` inline and drives it over HTTP).

## Mocks & tooling

- `src/__tests__/mocks/`: `MockUser`/`MockedUser`, `MockJobQueue`, `MockMailer`,
  `createFactory` — injected via the `tapModule(builder)` / `tapApp(app)` hooks on
  `createTestingApp`.
- `sinon` for stubs/spies, `supertest` for HTTP.

## Anti-patterns

- Writing server tests with vitest `describe/expect` — this package is AVA (`t.is`, `t.deepEqual`,
  typed `TestFn<Context>`).
- Skipping `initTestingDB()` in `beforeEach` — tests share a real Postgres schema.
- Hand-rolling app bootstrap instead of `createTestingApp` / `createTestingModule`.
