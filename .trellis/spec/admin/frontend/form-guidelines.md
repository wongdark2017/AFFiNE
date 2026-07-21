# 表单 — `@affine/admin`

生产屏中的 admin 表单是**非受控**（refs），不是 `react-hook-form`——即便存在 RHF 包装。

---

## 模式：`useRef` + `FormEvent` + `affineFetch`

**参考**：`packages/frontend/admin/src/modules/auth/index.tsx`

```tsx
const emailRef = useRef<HTMLInputElement>(null);
const passwordRef = useRef<HTMLInputElement>(null);

const login = useCallback(
  (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!emailRef.current || !passwordRef.current) return;

    affineFetch('/api/auth/sign-in', {
      method: 'POST',
      body: JSON.stringify({
        email: emailRef.current.value,
        password: passwordRef.current.value,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async response => {
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to login');
        }
        return response.json();
      })
      .then(() => {
        /* 后续 graphql / revalidate */
      })
      .catch(err => toast.error(`Failed to login: ${err.message}`));
  },
  [revalidate]
);

<form onSubmit={login} action="#">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" ref={emailRef} required />
  <Label htmlFor="password">Password</Label>
  <Input id="password" type="password" ref={passwordRef} required />
  <Button type="submit">Login</Button>
</form>;
```

### 观察到的约定

| 关注点    | 实践                                                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------- |
| 输入      | `@affine/admin/components/ui/input` + `Label`                                                                           |
| 反馈      | `sonner` 的 `toast`                                                                                                     |
| 鉴权 HTTP | `affineFetch` 辅助（`src/fetch-utils`）打 `/api/auth/*`                                                                 |
| GraphQL   | 常用内联 `fetch('/graphql', { body: JSON.stringify({ operationName, query, variables }) })`，文档来自 `@affine/graphql` |
| 原生校验  | HTML `required` / `type="email"`                                                                                        |

类似的 ref / `onChange` 混合见 setup（`modules/setup/create-admin.tsx`）与设置行（`modules/settings/config-input-row.tsx`）。

---

## react-hook-form 包装（可用，使用面轻）

**来源**：`packages/frontend/admin/src/components/ui/form.tsx`

导出基于 `react-hook-form` 的 `Controller` / `FormProvider` 的 shadcn 风格 `Form`、`FormField`、`FormControl`、`FormMessage` 等。

**启动规则**：不要要求每个新 admin 表单都用 RHF。对齐周围模块：

- 鉴权/setup 风格 → refs + `preventDefault` + toast。
- 仅当编辑的屏幕已端到端使用该套件时，再采用 `FormField`。

---

## 反模式

- 无必要把 core 的 `AuthInput` / `notify` 栈抄进 admin（admin 用自己的 UI 套件 + sonner）。
- 假定 admin 像 core 一样用 infra `useService(GraphQLService)` — admin 常直接用 `affineFetch` + graphql 文档。
