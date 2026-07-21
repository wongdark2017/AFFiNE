# 目录结构 — `@affine/server`

## 布局

```
packages/backend/server/src/
├── app.module.ts          # 根 Nest 模块
├── app.controller.ts      # /info 健康类端点
├── server.ts / index.ts   # 进程启动
├── base/                  # 横切基建（logger、error、guard、graphql、throttler、job、prisma 等）
├── core/                  # 一等产品领域（auth、workspaces、comment、permission 等）
│   └── <domain>/
│       ├── index.ts       # Nest 模块导出
│       ├── controller.ts  # REST（可选）
│       ├── resolver.ts    # GraphQL（可选）
│       ├── service.ts     # 业务逻辑
│       ├── types.ts       # GraphQL object/input 类型
│       └── __tests__/     # 领域自有时的共置测试
├── plugins/               # 可选功能（copilot、oauth、payment、worker 等）
├── models/                # 基于 Prisma 的 models（`BaseModel` 子类）
├── mails/                 # React 邮件模板
└── __tests__/             # 共享测试工具、mocks、e2e 套件
    ├── create-module.ts
    ├── mocks/
    ├── utils/
    └── e2e/
```

## 职责划分（按现有实践）

| 关注点         | 所在位置                      | 示例                                                                 |
| -------------- | ----------------------------- | -------------------------------------------------------------------- |
| HTTP 表面      | `controller.ts`               | `core/auth/controller.ts`、`core/workspaces/controller.ts`           |
| GraphQL 表面   | `resolver.ts` / `resolvers/*` | `core/comment/resolver.ts`、`core/workspaces/resolvers/workspace.ts` |
| 身份鉴权       | `core/auth/`                  | `guard.ts`、`session.ts`、`service.ts`                               |
| 资源权限       | `core/permission/`            | `builder.ts`，导出为 `PermissionAccess`                              |
| 共享 Nest 原语 | `base/`                       | logger、errors、throttler、graphql 辅助                              |
| DB 访问        | `models/`                     | 注入 `Models`，继承 `BaseModel`                                      |
| 可选产品能力   | `plugins/<name>/`             | copilot、oauth、payment                                              |

## 模块导出模式

每个领域目录从 `index.ts` 导出 Nest 模块，并由 `app.module.ts`（或插件聚合器）导入。新功能优先放在 `core/<name>/` 或 `plugins/<name>/`，避免把 handler 散落到无关模块。

## 反模式

- 在 resolver/controller 中堆业务规则，却不建 service/model，而同类功能已使用 `service.ts` + `Models`（见 comment / workspace 模块）。
- 在 `/api/...` 之外随意加 REST 路由，且与现有控制器不一致（`/api/auth`、`/api/workspaces`、`/api/oauth` 等）。
- 重复实现权限逻辑，而不使用 `PermissionAccess`（`ac.user(...).workspace(...).assert(...)`）。
