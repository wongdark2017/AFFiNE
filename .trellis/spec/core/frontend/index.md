# @affine/core — 前端规范（最小启动集）

> 焦点：`packages/frontend/core` 产品功能 UI 所需模式。
> 本文**不**声称完整设计系统 / BlockSuite 编辑器约定。

---

## 规范索引

| 规范                                  | 说明                         | 状态 |
| ------------------------------------- | ---------------------------- | ---- |
| [目录结构](./directory-structure.md)  | 包布局概览                   | 最小 |
| [表单](./form-guidelines.md)          | 受控表单、鉴权输入、校验     | 已填 |
| [组件规范](./component-guidelines.md) | 功能 UI 薄指针               | 最小 |
| [Hook 规范](./hook-guidelines.md)     | 延后                         | 延后 |
| [状态管理](./state-management.md)     | Services / live data（最小） | 最小 |
| [类型安全](./type-safety.md)          | 延后                         | 延后 |
| [质量规范](./quality-guidelines.md)   | Vitest 模式                  | 最小 |

---

## 主要相邻包

| 包                    | 角色                                               |
| --------------------- | -------------------------------------------------- |
| `@affine/component`   | 共享 UI + auth-components（`AuthInput`、密码字段） |
| `@affine/graphql`     | `GraphQLService.gql` 的类型化操作                  |
| `@affine/i18n`        | `useI18n` / `t['key']()`                           |
| `@toeverything/infra` | `useService`、`useLiveData`、`Service`             |
| `@affine/error`       | GraphQL 失败时的 `UserFriendlyError.fromAny`       |
