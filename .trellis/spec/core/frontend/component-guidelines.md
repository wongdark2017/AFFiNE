# 组件规范 — `@affine/core`（最小）

## 组合

- 优先使用 `@affine/component` 已有原语（`Button`、`Input`、`notify`、auth-components）。
- 功能屏通过 `@toeverything/infra` 组合服务，而不是层层下钻全局客户端。
- 模块已按该模式时，副作用放在 services/stores（如 cloud 的 `AuthService`、`GraphQLService`）。

## 样式

- core 屏幕常见与功能共置的 vanilla-extract / css modules（如 `sign-in/style.css`）。
- 需与周围 UI 对齐时用 `@toeverything/theme` 的主题 token（`cssVar`）。

## 测试挂钩

- 主操作常暴露 `data-testid`（见登录继续按钮）。

表单见 [form-guidelines.md](./form-guidelines.md)。
