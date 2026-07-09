# AFFiNE Trellis 规范 — 最小启动集

本 monorepo 包很多。**仅填写经真实代码验证的最小规范子集**，便于下一功能任务对齐现有模式，而非发明约定。

## 已填写（功能开发请用这些）

| 包 / 区域        | 路径                                         | 覆盖内容                                                             |
| ---------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| `@affine/server` | [server/backend/](./server/backend/index.md) | API 路由（REST + GraphQL）、鉴权、权限、日志、错误、Ava 测试、Models |
| `@affine/core`   | [core/frontend/](./core/frontend/index.md)   | 产品表单、服务 / GraphQL 客户端、Vitest 指针                         |
| `@affine/admin`  | [admin/frontend/](./admin/frontend/index.md) | 管理后台表单（refs + fetch）、UI 套件                                |
| 思考指南         | [guides/](./guides/index.md)                 | 跨层 / 复用问题                                                      |

## 明确延后

`.trellis/spec/*` 下其余树仍为 `trellis init` 的**模板脚手架**（待填写）。在根据代码填实之前，**不要**当作项目事实。

延后包括：BlockSuite 包、native/Rust、electron、mobile shells、大部分 `packages/common/*`、`tests/` 下 Playwright 套件、工具包等。

## 新功能如何使用

1. 若增加端点或权限，阅读 **server** 的 API + 鉴权规范。
2. 若增加产品 UI，阅读 **core** 表单与状态规范。
3. 仅当改 `packages/frontend/admin` 时读 **admin** 表单规范。
4. 任务的 `implement.jsonl` / `check.jsonl` 应指向这些已填文件，而非空模板。
5. 仅当功能波及范围包含某延后包时，再扩展该包规范。

## 模式速查

| 需求                | 遵循                                                                           |
| ------------------- | ------------------------------------------------------------------------------ |
| 新 GraphQL mutation | Nest `@Resolver` + `@CurrentUser` + `PermissionAccess.assert` + service/models |
| 新 REST `/api/...`  | Nest `@Controller` + 仅在有意公开时加 `@Public`                                |
| 服务端测试          | Ava + `createModule` / e2e `app.gql` + `@affine/graphql` 操作                  |
| Core 表单           | 受控 state + `preventDefault` + 调 service + `notify`                          |
| Admin 表单          | refs + `affineFetch` + `toast`                                                 |
| 服务端日志          | `Logger(Class.name)` 或注入的 `AFFiNELogger`                                   |
| 错误                | 抛出 `base/error` 下的 `UserFriendlyError` 子类                                |

## 事实来源

若本文与仓库源码冲突，**以源码为准**。模式变化时请同步更新规范。
