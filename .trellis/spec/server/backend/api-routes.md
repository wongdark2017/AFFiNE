# API 路由 — REST 控制器与 GraphQL Resolvers

AFFiNE 服务端主要有两种 API 形态。二者都受全局 `AuthGuard` 约束，并共享同一套用户 / 错误 / 权限模型。

---

## REST 控制器

### 模式

1. `@Controller('/api/<area>')` 类。
2. Nest 方法装饰器：`@Get`、`@Post`、`@Head` 等。
3. 公开接口用 `@Public()` 显式声明（**默认需登录**）。
4. 可选限流：`@Throttle(...)` / `@SkipThrottle()`。
5. 可选命名守卫：`@UseNamedGuard('version' | 'captcha' | 'selfhost' | ...)`。
6. 注入领域服务 + `PermissionAccess` / `Models`；失败时抛出 `UserFriendlyError` 子类。

### 参考实现

| 区域                | 文件                                                               |
| ------------------- | ------------------------------------------------------------------ |
| 服务信息            | `src/app.controller.ts`（`GET /info`，`@Public`，`@SkipThrottle`） |
| 鉴权                | `src/core/auth/controller.ts`（`/api/auth/*`）                     |
| 工作区 / blob / doc | `src/core/workspaces/controller.ts`（`/api/workspaces/*`）         |
| OAuth               | `src/plugins/oauth/controller.ts`（`/api/oauth/*`）                |
| Worker              | `src/plugins/worker/controller.ts`（`/api/worker/*`）              |
| Copilot 流式        | `src/plugins/copilot/controller.ts`                                |

### REST 骨架（对齐 auth 控制器风格）

```typescript
@Throttle('strict')
@Controller('/api/example')
export class ExampleController {
  constructor(private readonly service: ExampleService) {}

  @Public()
  @UseNamedGuard('version')
  @Post('/preflight')
  async preflight(@Body() body: { email: string }) {
    validators.assertValidEmail(body.email);
    return this.service.preflight(body.email);
  }

  @Get('/mine')
  async mine(@CurrentUser() user: CurrentUser) {
    return this.service.listForUser(user.id);
  }
}
```

### 何时用 REST 而不是 GraphQL

现有代码在以下场景用 REST：

- 二进制 / 流式响应（blobs、聊天流、图片代理）。
- 重度依赖 Cookie / 重定向 / Header 的鉴权流（`sign-in`、OAuth callback）。
- 标记 `@Internal()` 的内部 RPC 端点（服务间调用，带 `x-access-token`）。

GraphQL 难以表达文件——见 `WorkspacesController` 中关于 blob 下载的注释。

### REST 入参校验

- 优先使用 `src/core/utils/validators.ts` 中的共享辅助（`assertValidEmail`、`assertValidPassword`，基于 **zod**）。
- 抛出生成的友好错误（`InvalidEmail`、`InvalidPasswordLength` 等），而不是原始 Nest `BadRequestException`。

---

## GraphQL Resolvers

### 模式

1. `@Resolver(() => ParentType)`（常见为 `WorkspaceType` 或领域对象类型）。
2. 使用 `@nestjs/graphql` 的 `@Query` / `@Mutation` / `@ResolveField`。
3. 通过 `@CurrentUser()` 取用户（字段未标 `@Public()` 时必填）。
4. 权限：`await this.ac.user(me.id).workspace(id).assert('Workspace.Read')` 或 `.doc(...).assert('Doc....')`。
5. 领域工作放在注入的 `*Service` / `Models`。
6. GraphQL input/object 类型放在同目录 `types.ts`。

### 参考实现

| 领域         | 文件                                         |
| ------------ | -------------------------------------------- |
| Workspace    | `src/core/workspaces/resolvers/workspace.ts` |
| Comment      | `src/core/comment/resolver.ts`               |
| Auth session | `src/core/auth/resolver.ts`                  |
| Indexer      | `src/plugins/indexer/resolver.ts`            |
| License      | `src/plugins/license/resolver.ts`            |

### GraphQL 骨架（对齐 comment / workspace 风格）

```typescript
@Resolver(() => WorkspaceType)
export class ExampleResolver {
  constructor(
    private readonly service: ExampleService,
    private readonly ac: PermissionAccess
  ) {}

  @Mutation(() => ExampleType)
  async createExample(@CurrentUser() me: UserType, @Args('input') input: ExampleCreateInput) {
    await this.ac.user(me.id).doc(input.workspaceId, input.docId).assert('Doc.Update');

    return this.service.create({ ...input, userId: me.id });
  }
}
```

### GraphQL 类型

- 在 `types.ts` 用 Nest GraphQL 装饰器定义入参/出参。
- 共享分页辅助：`src/base/graphql`（`PaginationInput`、`paginateWithCustomCursor` 等）。
- Schema 由 Nest GraphQL 生成/服务（树中有 `src/schema.gql`）。

### 前端消费（跨层提示）

客户端通过 `@affine/core` 中的 `GraphQLService.gql`（`modules/cloud/services/graphql.ts`）调用 `@affine/graphql` 的类型化操作，功能模块中一般不手写查询字符串（admin 有部分例外——见 admin 表单规范）。

---

## 共享路由关注点

| 关注点       | 机制                             | 文件                      |
| ------------ | -------------------------------- | ------------------------- |
| 默认鉴权     | 全局 `AuthGuard`                 | `src/core/auth/guard.ts`  |
| 公开 opt-out | `@Public()`                      | 同上                      |
| 内部 RPC     | `@Internal()` + `x-access-token` | 同上                      |
| 命名守卫     | `@UseNamedGuard(...)`            | `src/base/guard/guard.ts` |
| 限流         | `@Throttle` / `@SkipThrottle`    | `src/base/throttler/`     |
| 指标         | `@CallMetric(...)`               | copilot 控制器在用        |

---

## 反模式

- 假定 GraphQL 字段公开——没有 `@Public()` 时，缺鉴权会抛 `AuthenticationRequired`。
- 只在客户端做权限检查。
- 同级已用专用 `*ObjectType` 时，直接返回原始 Prisma 行。
- 在 Nest 控制器之外自建 Express router。
