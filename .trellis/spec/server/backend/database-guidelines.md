# 数据库规范 — `@affine/server`（最小）

仅覆盖典型功能开发所需模式。不是完整 schema 设计指南。

## 访问路径

- 不要在每个 resolver 中随意注入 Prisma client。
- 领域代码使用 **`Models`** 门面与 `src/models/` 下的 model 类。
- Model 类继承 **`BaseModel`**（`src/models/base.ts`），提供：
  - `this.db` — 经 `@nestjs-cls/transactional` 的事务 Prisma client
  - `this.models` — 兄弟 models
  - `this.logger` — Nest logger

## Schema 与迁移

- Schema：`packages/backend/server/schema.prisma`
- SQL 迁移：`packages/backend/server/migrations/`
- 应用数据迁移 / 脚本：`src/data/`

## 功能开发规则

1. 在合适的 `src/models/*.ts` 类上新增或扩展 model 方法。
2. 通过注入的 `Models` 在 service/resolver 中调用。
3. 权限检查放在 API 层（`PermissionAccess`），不要只埋在 SQL 里。

## 反模式

- 对 model 已覆盖的标准 CRUD 在 resolver 里写裸 SQL。
- 多步写入已有 `BaseModel`/`TransactionHost` 模式时绕过事务。
