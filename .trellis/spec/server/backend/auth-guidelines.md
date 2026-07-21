# 鉴权检查 — 身份与权限

两层：

1. **身份** — 是否已登录（或入口是否公开/内部）？
2. **授权** — 该用户是否拥有工作区/文档动作权限？

---

## 第一层：身份（`AuthGuard`）

**来源**：`packages/backend/server/src/core/auth/guard.ts`

### 默认行为

每个控制器方法与 GraphQL 字段**默认需要鉴权**，除非另有标记。未登录访问会抛 `AuthenticationRequired`。

### 装饰器

| 装饰器        | 效果                                                               |
| ------------- | ------------------------------------------------------------------ |
| `@Public()`   | 不强制登录；仍会**尝试**登录，因此 `@CurrentUser()` 可能有值       |
| `@Internal()` | 仅服务间调用；校验 `x-access-token`（method + path + nonce + TTL） |
| （无）        | 需要 session / JWT / access token 用户                             |

定义在 `guard.ts` 底部：

```typescript
export const Public = () => SetMetadata(PUBLIC_ENTRYPOINT_SYMBOL, true);
export const Internal = () => SetMetadata(INTERNAL_ENTRYPOINT_SYMBOL, true);
```

### 注入用户

**来源**：`packages/backend/server/src/core/auth/session.ts`

```typescript
// 需要登录（非 public）
@Get('/private')
private(@CurrentUser() user: CurrentUser) { ... }

// 公开 — 用户可选
@Public()
@Get('/public')
home(@CurrentUser() user?: CurrentUser) { ... }

// 需要完整 session 时
@Get('/session')
session(@Session() session: Session) { ... }
```

`CurrentUser` 解析为 `req.session?.user ?? req.token?.user`。

### 凭证如何解析

`AuthGuard.signIn` 大致按以下顺序解析：

1. Bearer JWT（`Authorization: Bearer …`）
2. 旧版不透明 session id 作为 bearer
3. Access token session
4. Session cookie

测试文档见：`src/__tests__/auth/guard.spec.ts`。

### 命名守卫（额外检查）

**来源**：`src/base/guard/guard.ts` — `@UseNamedGuard('captcha' | 'version' | 'selfhost' | …)`

auth 控制器示例：

```typescript
@Public()
@UseNamedGuard('version', 'captcha')
@Post('/sign-in')
async signIn(...) { ... }
```

命名守卫用于**已注册**的横切检查；captcha/version 已有命名守卫时，不要再发明临时中间件。

---

## 第二层：资源权限（`PermissionAccess`）

**来源**：`src/core/permission/builder.ts`  
**导出别名**：`src/core/permission/index.ts` 的 `PermissionAccess`

### 流式 API

```typescript
// 工作区动作
await this.ac.user(userId).workspace(workspaceId).assert('Workspace.Read');

// 文档动作
await this.ac.user(userId).doc(workspaceId, docId).assert('Doc.Comments.Create');

// 布尔探测
const ok = await this.ac.user(userId).doc(workspaceId, docId).can('Doc.Read');

// 完整权限图
const { role, permissions } = await this.ac.user(userId).workspace(workspaceId).permissions();
```

- `.assert(action)` — 拒绝时抛错（API 边界首选）。
- `.can(action)` — 返回布尔（公开/共享文档分支等，见 workspaces 控制器）。
- `.allowLocal()` — 构建器上的本地工作区例外链。

动作名来自 `src/core/permission/types.ts` 的 `DOC_ACTIONS` / `WORKSPACE_ACTIONS`（如 `Doc.Read`、`Workspace.Users.Read`、`Doc.Comments.Create`）。

### 检查落点

| 表面             | 示例                                                                   |
| ---------------- | ---------------------------------------------------------------------- |
| GraphQL mutation | `CommentResolver.createComment` → `assertPermission` / `ac...assert`   |
| GraphQL field    | `WorkspaceResolver.role` → `ac.user(...).workspace(...).permissions()` |
| REST             | `WorkspacesController` blob/doc 路由 → `.can` / `.assert`              |
| Realtime         | `core/sync/gateway.ts`、workspace realtime 模块                        |

### 参考模块

- `src/core/comment/resolver.ts` — 文档级评论动作
- `src/core/workspaces/resolvers/workspace.ts` — 工作区角色/权限字段
- `src/core/workspaces/controller.ts` — 公开 vs 已登录读取路径
- `src/plugins/indexer/resolver.ts` — 搜索前 `Workspace.Read`

---

## 管理员 / 特殊角色

管理后台路径除登录外还有 feature / 角色检查（见 `core/common/admin-guard.ts` 与 license admin resolvers）。不要把「已登录」当作「管理员」。

---

## 反模式

- 本意公开的端点忘记 `@Public()`（全局守卫会拦住）。
- 用了 `@Public()` 却假定 `CurrentUser` 一定有值。
- 已有动作枚举时，在 resolver 里手写角色 SQL，而不用 `PermissionAccess`。
- 只信客户端权限 UI，服务端不做 `.assert`。
- 打印或返回完整 session 密钥 / token。
