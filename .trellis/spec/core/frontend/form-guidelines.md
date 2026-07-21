# 表单 — `@affine/core`（及共享鉴权组件）

基于**真实**登录与密码流程整理。本包产品表单**不以** `react-hook-form` 为标准。

---

## 模式 A：受控 React state + preventDefault

**参考**：`packages/frontend/core/src/components/sign-in/sign-in.tsx`

```tsx
const [email, setEmail] = useState('');
const [isValidEmail, setIsValidEmail] = useState(true);
const [isMutating, setIsMutating] = useState(false);

const onContinue = useAsyncCallback(async () => {
  if (!validateEmail(email)) {
    setIsValidEmail(false);
    return;
  }
  setIsMutating(true);
  try {
    const { methods } = await authService.checkUserByEmail(email);
    // 按 methods 分支...
  } catch (err: any) {
    notify.error({ title: '...', message: err.message });
  }
  setIsMutating(false);
}, [authService, email /* ... */]);

<form
  onSubmit={event => {
    event.preventDefault();
    onContinue();
  }}
>
  <AuthInput label={t['com.affine.settings.email']()} onChange={setEmail} error={!isValidEmail} errorHint={isValidEmail ? '' : t['com.affine.auth.sign.email.error']()} onEnter={onContinue} type="email" name="username" autoComplete="username" />
  <Button loading={isMutating} disabled={isMutating} data-testid="continue-login-button">
    ...
  </Button>
</form>;
```

### 观察到的约定

| 关注点   | 实践                                                                                |
| -------- | ----------------------------------------------------------------------------------- |
| 提交     | `<form onSubmit>` + `event.preventDefault()`                                        |
| 字段状态 | `useState`（受控）                                                                  |
| 异步提交 | core hooks 的 `useAsyncCallback`                                                    |
| 错误     | 本地布尔 + 输入上的 `error` / `errorHint`；toast 用 `@affine/component` 的 `notify` |
| 文案     | `useI18n()` 键（有键时），避免硬编码用户文案                                        |
| 服务     | `useService(AuthService)` / `useLiveData(...)` 取会话                               |
| 测试 id  | 主 CTA 上的 `data-testid`                                                           |

同一表单壳也见于 `sign-in-with-password.tsx`。

---

## 模式 B：共享鉴权字段组件

**包**：`@affine/component` auth-components

| 组件            | 路径                                                                        | 角色                                 |
| --------------- | --------------------------------------------------------------------------- | ------------------------------------ |
| `AuthInput`     | `packages/frontend/component/src/components/auth-components/auth-input.tsx` | Label + `Input` + 错误提示           |
| `PasswordInput` | `.../password-input/index.tsx`                                              | Zod + 强度计；`onPass` / `onPrevent` |

`AuthInput` 是薄封装：`error` 切换输入状态与提示可见性。鉴权相关屏优先用它；其它处与周围屏幕一致地使用 `@affine/component` 的 `Input` / 功能本地字段。

---

## 模式 C：复杂规则时用 Zod

**参考**：`PasswordInput` 使用 `z.string().superRefine(...)`，并依赖服务端下发的 `passwordLimits`。

**服务端对应**：`packages/backend/server/src/core/utils/validators.ts` 也对 email/password 用 zod，再抛 `UserFriendlyError`。

不要为每个屏幕发明全表单 zod schema 层——仅在代码库已有做法处使用（密码强度 / 限制）。

---

## 从表单调 API

优先领域服务，而不是原始 `fetch`：

```typescript
// GraphQL
await graphQLService.gql({ query: someMutation, variables: { ... } });
// 实现于 packages/frontend/core/src/modules/cloud/services/graphql.ts
// 包装 @affine/graphql 的 gqlFetcherFactory，并用 UserFriendlyError 映射错误
```

邮箱检查走 cloud 模块的 `AuthService`，当已有服务时不要在组件里内联 REST。

---

## 反模式（相对当前 core 代码）

- 把 `react-hook-form` 当作 core 产品表单默认（admin 有包装；core 登录不用）。
- 提交时不对 `<form>` 做 `preventDefault`。
- 静默失败（无 `notify.error` / 错误状态）。
- 在 `@affine/graphql` 已导出操作时，再复制手写 GraphQL 文档字符串。
