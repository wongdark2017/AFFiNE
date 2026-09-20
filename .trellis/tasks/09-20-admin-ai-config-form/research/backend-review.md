# 后端正式验收（2026-09-20）

## 确认的装配与契约

- `CopilotAdminController` 已注册到 `CopilotModule`；生产启动 `server.ts` 全局启用 `AuthGuard` 与 `CloudThrottlerGuard`；控制器继续使用 `@Admin()`、`@Throttle('strict')`。
- 探测为短小非流式聊天，`max_completion_tokens: 32` 与本机已安装 `llm_adapter 0.2.8` 的 OpenAI Chat 编码一致；仅参数不支持的 HTTP 400 可以重试一次；两次请求、错误体读取、成功体读取共用 20 秒 signal。
- 草稿模型发现和连接测试不存配置、不改运行期模型缓存、不回显上游正文；运行期缓存保留原有 TTL、合并请求和失败保留旧列表行为。

## 本轮修复

1. 控制器之前可接受有管理员 Cookie 的简单表单 POST，却未校验 CSRF。现按现有 auth 控制器的双提交机制要求 Cookie 和 `x-affine-csrf-token` 一致。仅经过 AuthGuard 确认的 `req.authType === 'jwt'` 豁免；前端 `affineFetch` 已自动附带 token，无需修改 UI。新增两条路由各自缺失/错误 token、跨站表单、Bearer 会话测试；原有成功测试带有效 token。
2. 模型发现读取 body 完毕后未重新验证期限，现补 `signal.throwIfAborted()` 并验证过期 JSON 结果不能成功。
3. 草稿 helper 支持 `/proxy/v1///`，原生产 native config 仅去掉 `/v1` 和 `/v1/`，可能出现测试成功、生产双 `/v1` 的错位。现兼容接口生产配置和探测复用 `openAICompatibleBaseURL`；其它服务商配置不变。HTTP 套件中新增 native config 和探测 URL 一致性用例。
4. 当结构化错误指向其它字段（如 temperature）或 invalid_value，不能仅因正文提到 max_completion_tokens 就重试。现明确结构化信息优先，并在原失败矩阵内补断言。

## 验证

- `yarn exec ava --config /tmp/affine-connection-helper-ava.config.mjs --serial`（server 包目录）：24 项通过。包括真实本机 HTTP 上游收发、悬挂成功响应体按共享 deadline 中止。
- `yarn exec tsc -p packages/backend/server/tsconfig.json --noEmit`：通过。
- 本轮 8 个后端文件 ESLint 与 Prettier 检查通过，范围内 `git diff --check` 通过。全仓 diff-check 检出既有 `byok/service.ts:198` 尾空格，按所有权要求未触碰。
- HTTP 权限/native URL 一致性套件使用 `/tmp/affine-connection-http-ava.config.mjs`，等待主 agent 完成本机 native 依赖构建后执行；不将依赖加载前的失败写成业务通过。
- 未接触真实用户 API key，网络只请求回环测试服务；未修改 byok/service.ts；未提交。

## 主 agent 补齐的最终验证

本机 native 依赖已从当前源码构建并确认可加载。17 项 HTTP 权限与 URL 一致性用例已实际执行并全部通过，解除此前环境限制。
