# 状态管理 — `@affine/core`（最小）

## 观察到的技术栈

| 工具                               | 用途                                                                 |
| ---------------------------------- | -------------------------------------------------------------------- |
| `@toeverything/infra` 的 `Service` | 长生命周期协作者（`GraphQLService`、`AuthService`、`ServerService`） |
| `useService(Token)`                | 在 React 中解析服务                                                  |
| `useLiveData(observable$)`         | 订阅服务状态（如会话状态、服务端配置）                               |
| 本地 `useState`                    | 瞬时表单字段与对话框 UI                                              |

## GraphQL

`modules/cloud/services/graphql.ts` 中的 `GraphQLService.gql` / `rxGql` 是 core 模块访问云端操作的标准类型化客户端路径。

## 反模式

- 为已适合 infra Services 的功能新建全局 Redux/MobX store。
- 在 scope 内已有 `GraphQLService` 时，从 core 视图直接 `fetch('/graphql')`。
