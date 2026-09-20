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

## 管理员设置中的对象表单

`modules/settings/copilot-settings.tsx` 将 AI 对象配置呈现为受控的逐项输入，复用 `useAppConfig` 的分组保存和取消，不单独发送请求。

- 使用 `update('copilot/providers.openaiCompatible/apiKey', value)` 更新叶字段。路径格式为 `module/configKey/sub.path`；配置键本身可以含点，嵌套字段也可含点，例如 `copilot/storage/config.credentials.secretAccessKey`。
- Hook 会复制整个原始配置对象并修改指定叶字段，保留未展示的扩展选项。不要只用可见的几个输入重新构造完整服务商对象。
- 密钥使用真实值配合 `type="password"` 遮挡，显示/隐藏只修改 UI 状态。不能把掩码字符串作为配置提交；空字符串必须可保存，以便移除密钥。
- 控件绑定父级当前配置，保存/取消通过分组版本重挂载还原局部状态；未配置的服务商不应阻塞其他服务商的保存。
- AI 分组在保存期间用无边框原生 `fieldset disabled` 禁用整组输入与按钮，避免慢请求完成时覆盖期间新输入的密钥。保存成功/失败均解锁；失败必须保留草稿以便重试或取消。标题仍用普通 heading，不使用 legend。
- 新文案使用 `t()` 并添加 `i18n/zh.ts`，不要修改生成的 `src/config.json`。
- 卡片内标题使用普通 heading，并通过 `role="group"` / `aria-labelledby` 保留分组语义；不要使用会横跨边框的 `fieldset > legend` 样式。
- 保存响应包含的是每个已提交配置项的完整值，缓存必须按该项整体替换（`applySavedConfig`），不能递归 merge 到旧对象，否则被清空的可选属性会恢复并在下次编辑时被重新提交。
- 存储表单默认值需与运行时一致：S3 空 endpoint 和 R2 默认 jurisdiction 应省略，R2 region 缺省为 `auto`，`signContentTypeForPut` 缺省为 `true`。不能把界面“默认”标签字面值当作后端地址的一部分。

验证重点是用户修改单字段后的最终保存载荷、未知字段保留、取消还原及密钥显示切换不触发保存，而不是复刻组件内部实现。

页面级闭环测试使用真实 `SettingsPage → CopilotSettings → useAppConfig`，仅替换网络/缓存边界。Happy DOM 不模拟 fieldset 对子控件的 `:disabled` 继承，单测需验证控件位于禁用的 fieldset 内，并通过浏览器行为确认。

## 管理员草稿模型发现

### 范围与入口

`OpenAICompatibleModelInput` 使用当前未保存的 `apiKey` / `baseURL` 获取候选模型，查询不要求 `defaultModel`，也不写入服务端配置。

### 接口与数据

- `affineFetch` 同源 `POST /api/copilot/admin/models`，请求 `{ apiKey: string, baseURL: string }`，响应 `{ models: string[] }`。
- 服务端默认鉴权并额外要求管理员，查询通过后端访问上游 `/v1/models`，浏览器不直接跨域请求模型服务。
- 用户选择或手动输入才调用原配置子字段更新；模型列表、加载状态、搜索词不能写入配置或持久化存储。

### 失败与状态

缺少地址/密钥时禁用获取；请求期间显示加载。错误显示经本地化的固定安全文案并允许重试；空列表显示手动输入提示，不覆盖既有模型。地址/密钥变化时清空候选并中止或忽略旧响应，卸载也必须清理请求。

### 验证场景

- 正常：未保存的接口草稿可获取，点击选项仅更新默认模型。
- 默认：已有模型保留，打开新列表时可看到其他模型；手动输入始终可用。
- 失败：鉴权/网络/无效数据/空列表可以恢复；迟到的旧响应不得覆盖新接口结果。
- 安全：密钥只经请求体发往同源接口，不置于 URL，不输出日志或错误提示。

### 错误与正确做法

错误：先保存临时配置再调用工作区模型接口，或在地址变更后继续展示旧列表。

正确：专用管理员草稿查询，不修改已保存配置；组件管理请求生命周期和候选状态。

### 连接测试

`OpenAICompatibleConnectionTest` 在兼容接口卡片底部使用当前 `{apiKey, baseURL, defaultModel}` 调用 `POST /api/copilot/admin/test-connection`，读取 `{model, latencyMs}`。测试不调用配置更新、不改变 dirty 状态；用量提示放在按钮旁，缺少任一字段时禁用。凭据、地址或模型变化时清除结果并中止/忽略旧请求。模型发现和连接测试共用 `getCopilotProviderError` 的安全文案白名单，不能把未知服务端内容回显到页面。

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
