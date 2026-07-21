# 错误处理 — `@affine/server`

## 用户可见错误

所有有意的 API 失败都应是 **`UserFriendlyError`**（及生成子类）的实例。

**来源**：

- 基类：`src/base/error/def.ts`
- 生成类 / 名称：`src/base/error/errors.gen.ts`（开发时由定义生成）
- 再导出：`src/base/error/index.ts`

### 行为

- 将业务 `type` 映射到 HTTP 状态（`authentication_required` → 401、`no_permission` → 403、`resource_not_found` → 404 等）。
- 携带机器可读的 `name`、可选 `data` 参数，以及 `requestId`。
- 对 `internal_server_error` **禁止**覆盖 message，以免泄露内部信息。

### 抛出模式

```typescript
import { InvalidEmail, CommentNotFound, DocActionDenied } from '../../base';

// 校验
throw new InvalidEmail({ email });

// 未找到
if (!comment) throw new CommentNotFound();

// 权限（常在 PermissionService.assert* 内部抛出，或显式抛出）
throw new DocActionDenied({ docId, spaceId: workspaceId, action: 'Doc.Read' });
```

**参考**：

- 校验器 → 友好错误：`src/core/utils/validators.ts`
- Comment resolver：`src/core/comment/resolver.ts`
- Auth 控制器：`src/core/auth/controller.ts`（`ActionForbidden`、`WrongSignInCredentials` 等）

### 不要

- 在已有 `UserFriendlyError` 子类时，对预期业务失败抛裸 `Error` 或 Nest `HttpException`。
- 把内部栈细节写进用户可见文案。

---

## 鉴权相关错误

| 情况                | 错误                       |
| ------------------- | -------------------------- |
| 受保护路由缺少凭证  | `AuthenticationRequired`   |
| 内部 RPC token 无效 | `AccessDenied`             |
| 客户端版本过旧      | `UnsupportedClientVersion` |

由 `AuthGuard` 抛出（`src/core/auth/guard.ts`）。

---

## 权限拒绝

`PermissionAccess.assert*` 路径会抛出空间/文档访问错误（如 `SpaceAccessDenied`、`DocActionDenied`）。边界上优先 `.assert(action)`，使拒绝请求进不到变更型 service 代码。

---

## 客户端映射

前端通过 `@affine/error` 的 `UserFriendlyError.fromAny` 映射服务端错误（见 core 的 `GraphQLService.gql`）。客户端已按 error `name`/args 分支时，保持其稳定。
