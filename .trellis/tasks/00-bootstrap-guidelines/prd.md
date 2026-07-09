# 启动任务：最小项目规范（基于证据）

**你（AI）在执行本任务。开发者不会读这个文件。**

## 目标

从**当前代码**填充**最小** `.trellis/spec/` 集合，足以支撑下一功能任务（API 路由、鉴权、日志、测试、前端表单）。**不要**用占位符填满 monorepo 每个包。

## 状态

### 已填（最小启动集）

- [x] `@affine/server` 后端 — API 路由、鉴权、日志、错误、测试、目录、DB 最小
- [x] `@affine/core` 前端 — 表单 + 薄相关指南
- [x] `@affine/admin` 前端 — 表单 + 薄相关指南
- [x] Spec 根索引：已填 vs 延后包
- [x] 技术文档中文化（规范、guides、workflow、docs/ 等）

### 延后（有意不填）

`.trellis/spec/` 下其余包树仍为 init 模板。**仅当功能触及它们时**再填。

延后示例：BlockSuite、electron、mobile、native、nbstore、Playwright `tests/*`、多数 common 库、工具包。

---

## 架构上下文（来自检查）

| 主题         | 仓库现实                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------- |
| API          | NestJS **REST**（`@Controller('/api/...')`）+ **GraphQL**（`@Resolver` / `@Mutation` / `@Query`） |
| 身份鉴权     | 全局 `AuthGuard`；`@Public()` / `@Internal()`；`@CurrentUser()`                                   |
| 授权         | `PermissionAccess`（`ac.user().workspace()\|doc().assert\|can`）                                  |
| 日志         | models 上 Nest `Logger`；可选注入 `AFFiNELogger`（请求 id）                                       |
| 错误         | `base/error` 下 `UserFriendlyError` 体系                                                          |
| 服务端测试   | **Ava**；`createModule`；e2e 用 `app.gql` + `@affine/graphql`                                     |
| Core 表单    | 受控 `useState` + `<form onSubmit preventDefault>` + services/`notify`                            |
| Admin 表单   | 非受控 `useRef` + `affineFetch` + `toast`；RHF 包装存在但非主导                                   |
| 前端单元测试 | **Vitest** + Testing Library                                                                      |

## 已写文件

- `.trellis/spec/index.md`
- `.trellis/spec/server/backend/*`（含 `api-routes.md`、`auth-guidelines.md`）
- `.trellis/spec/core/frontend/*`（含 `form-guidelines.md`）
- `.trellis/spec/admin/frontend/*`（含 `form-guidelines.md`）

## 规则

- 规范描述代码**现在怎么做**，不是理想重构。
- 本启动不改产品源码。
- 每条重要规则指向 `packages/` 下真实路径。

## 验收标准

- [x] 服务端 API/鉴权/日志/测试有文件引用
- [x] Core + admin 表单模式有文件引用
- [x] **已填**包中无 `To be filled by the team`
- [x] 根索引说明哪些包延后
- [x] 技术文档中文化
- [ ] 开发者确认范围；满意后归档启动任务

## 完成

开发者满意最小集后：

```bash
python3 ./.trellis/scripts/task.py finish
python3 ./.trellis/scripts/task.py archive 00-bootstrap-guidelines
```

后续包规范应在功能落地该包时**增量**填写，而不是批量填模板。
