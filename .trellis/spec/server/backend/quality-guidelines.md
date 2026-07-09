# 质量与测试 — `@affine/server`

## 测试运行器

| 种类                       | 工具                  | 配置 / 命令                                                |
| -------------------------- | --------------------- | ---------------------------------------------------------- |
| 单元 / 集成                | **Ava**               | `packages/backend/server/ava.config.js` · 包内 `yarn test` |
| 服务端 e2e（GraphQL/HTTP） | Ava + `TEST_MODE=e2e` | `src/__tests__/e2e/**/*.spec.ts` · `yarn e2e`              |
| 应用 Playwright e2e        | `tests/` 下独立包     | 本文不覆盖                                                 |

Ava 文件：`**/*.spec.ts`、`**/*.e2e.ts`（默认运行排除 e2e 套件）。

---

## 单元 / 模块测试

### 优先 `createModule`

**来源**：`src/__tests__/create-module.ts`

```typescript
await using module = await createModule({
  imports: [
    /* 领域模块 */
  ],
});
// module.create = mock 工厂
// module.queue / module.event = mocks
```

使用功能模块，并将 `JobQueue` / `EventBus` mock 掉。通过 `Symbol.asyncDispose` 自动释放。

### HTTP 守卫 / 控制器测试

**来源**：`src/__tests__/utils/testing-module.ts`（`createTestingModule`，纯 DI 测试更推荐 `createModule`）以及 `createTestingApp` 辅助，用于：

- `src/__tests__/auth/guard.spec.ts` — supertest + cookie/JWT
- `src/core/doc-service/__tests__/controller.spec.ts` — 内部 token 矩阵

模式：

```typescript
import ava, { TestFn } from 'ava';
import request from 'supertest';
import { createTestingApp, TestingApp } from '../utils';

const test = ava as TestFn<{ app: TestingApp }>;

test.before(async t => {
  t.context.app = await createTestingApp({ imports: [AuthModule], controllers: [...] });
});

test.beforeEach(async t => {
  await t.context.app.initTestingDB();
});

test.after.always(async t => {
  await t.context.app.close();
});

test('should ...', async t => {
  const res = await request(t.context.server).get('/public').expect(200);
  t.is(res.body.user, undefined);
});
```

### DB 隔离

`initTestingDB` 会截断非迁移表（`src/__tests__/utils/utils.ts`）。测试会改库时在 `beforeEach` 调用。

### 测试日志

默认测试日志级别为 `fatal`（`TEST_LOG_LEVEL`），以降低噪音。

---

## GraphQL e2e 测试

**来源**：`src/__tests__/e2e/**/*.spec.ts`  
**辅助**：`src/__tests__/e2e/test.ts` 导出 `app`、`e2e`。

模式见 `e2e/comment/resolver.spec.ts`：

```typescript
import { createCommentMutation } from '@affine/graphql';
import { Mockers } from '../../mocks';
import { app, e2e } from '../test';

const owner = /* 通过 app.create(Mockers.User) 创建 */;
await app.login(owner);
const result = await app.gql({
  query: createCommentMutation,
  variables: { input: { ... } },
});
t.truthy(result.createComment.id);
```

- 使用 `@affine/graphql` 的**生成**操作，不要手写 query 字符串。
- 用 `Mockers.*` 工厂造数。
- 需登录的操作前 `app.login(user)`。

---

## 共置 vs 共享测试

| 位置                                | 用途                                         |
| ----------------------------------- | -------------------------------------------- |
| `src/core/<domain>/__tests__/`      | 领域单元测试（permission builder、services） |
| `src/__tests__/auth/`、`workspace/` | 跨模块 HTTP 测试                             |
| `src/__tests__/e2e/`                | 完整应用 GraphQL/HTTP 流                     |
| `src/__tests__/mocks/`              | 共享 mockers                                 |

---

## 快照

Ava 快照与 spec 同目录（`*.snap` / markdown 快照）。输出契约变化时再有意更新。

---

## 反模式

- 在 `@affine/server` 内用 Vitest/`describe`/`it`（本包是 Ava）。
- 无 mock 就打真实网络支付/OAuth。
- 改库却跳过 `initTestingDB`，导致用例互相污染。
- 新保护路由只断言 HTTP 200，不测鉴权拒绝用例。
