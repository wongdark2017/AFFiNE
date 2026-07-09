# @affine/server — 后端规范

> `packages/backend/server` 中 NestJS 服务端工作的事实来源。
> 规范仅记录**现有模式**，并附当前源码路径。

---

## 范围

| 范围内                    | 本启动集范围外                  |
| ------------------------- | ------------------------------- |
| `/api/*` 下的 REST 控制器 | 桌面 / 移动 native 包           |
| GraphQL resolvers         | BlockSuite 编辑器内部           |
| 鉴权 + 权限检查           | 完整 Prisma schema 设计指南     |
| 日志 + 用户可见错误       | 前端 UI 实现                    |
| Ava 单元 / e2e 测试       | Playwright 应用 e2e（`tests/`） |

---

## 规范索引

| 规范                                   | 说明                                               | 状态 |
| -------------------------------------- | -------------------------------------------------- | ---- |
| [目录结构](./directory-structure.md)   | 模块布局（`base` / `core` / `plugins` / `models`） | 已填 |
| [API 路由](./api-routes.md)            | REST 控制器 + GraphQL resolvers                    | 已填 |
| [鉴权检查](./auth-guidelines.md)       | `@Public`、`@CurrentUser`、`PermissionAccess`      | 已填 |
| [错误处理](./error-handling.md)        | `UserFriendlyError` 抛出模式                       | 已填 |
| [日志规范](./logging-guidelines.md)    | Nest `Logger` + `AFFiNELogger`                     | 已填 |
| [质量与测试](./quality-guidelines.md)  | Ava、`createModule`、e2e 辅助                      | 已填 |
| [数据库规范](./database-guidelines.md) | 经 `Models` / `BaseModel` 的 Prisma                | 最小 |

---

## 包入口

- 应用装配：`packages/backend/server/src/app.module.ts`
- 服务启动：`packages/backend/server/src/server.ts`
- 共享基建：`packages/backend/server/src/base/`
- 领域功能：`packages/backend/server/src/core/`
- 可选插件：`packages/backend/server/src/plugins/`
- 数据访问：`packages/backend/server/src/models/`

**语言**：中文。
