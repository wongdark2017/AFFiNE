# 日志规范 — `@affine/server`

## 推荐日志器

### 领域代码（models、多数 services）

使用 Nest 的 `Logger`，并以类名为上下文：

```typescript
// src/models/base.ts
export class BaseModel {
  protected readonly logger = new Logger(this.constructor.name);
}
```

```typescript
// 控制器中常见同样写法
logger = new Logger(WorkspacesController.name);
```

**参考**：`src/models/base.ts`、`src/core/workspaces/controller.ts`、`src/base/job/queue/queue.ts`。

### 注入的 AFFiNE 日志器

`AFFiNELogger` 扩展 Nest `ConsoleLogger`，并从 CLS 为日志加上 request id 前缀：

**来源**：`src/base/logger/service.ts`

```typescript
constructor(private readonly logger: AFFiNELogger) {
  logger.setContext(WorkspaceResolver.name);
}
```

**参考**：`src/core/workspaces/resolvers/workspace.ts`。

模块为全局：`src/base/logger/index.ts` 导出 `LoggerModule` + `AFFiNELogger`。

### 源码中的重要注释

`AFFiNELogger` 文件写明：

> DO NOT use this Logger directly  
> Use it via: `private readonly logger = new Logger(MyService.name)`

实践中两种写法都存在。建议：

- 本地类日志器优先 `new Logger(ClassName.name)`（models/jobs 中多数如此）。
- 周围模块已注入 `AFFiNELogger` 时继续注入并用 `setContext`；或需要重写后的 `error(message, err)` 栈格式时再注入。

---

## 日志级别（观察到的用法）

| 级别           | 典型用途                                                     |
| -------------- | ------------------------------------------------------------ |
| `debug`        | 生命周期噪音（用户创建/更新、任务入队）— 如 `models/user.ts` |
| `log` / `info` | 值得关注的变更（评论删除、账号断开）                         |
| `warn`         | 配置问题 / 可恢复问题（`CryptoHelper` 缺密钥）               |
| `error`        | 带栈的失败 — 优先 `AFFiNELogger.error(msg, err)` 以便打印栈  |

---

## 请求关联

`AFFiNELogger.stringifyMessage` 在 CLS 有 id 时会前缀 `<requestId>`（`AFFiNELogger.getRequestId()`）。错误也会通过 `UserFriendlyError` 附带 request id。

---

## 与错误日志的交互

`AFFiNELogger.formatStack` 对 `UserFriendlyError` 使用 `stacktrace`（内部栈），因为 Nest 默认对这类错误的栈打印帮助不大。

---

## 应记录

- 特权变更成功后的资源 id（user id、workspace id、job id）。
- 任务队列入队/完成的高层事件。
- 启动时的配置问题。

## 不应记录

- 密码、magic-link token、原始 session cookie、内部 access token。
- 可能含凭证的完整请求体（auth 控制器不会记录 credential 载荷）。
- 超出现有 model debug 日志范围的额外 PII（部分 debug 行已含 email — 无产品需求不要再扩大）。

---

## 前端说明

浏览器包使用 `@affine/debug` 的 `DebugLogger`（`packages/common/debug`），**不是** Nest 日志器。不要把 `AFFiNELogger` 导入前端。

---

## 反模式

- 在服务端请求路径里 `console.log`。
- 吞掉错误却不记录也不重抛。
- 把 `Error` 传给 Nest `Logger.error` 却不理解栈可能被省略 — 需要栈时用 `AFFiNELogger.error(message, err)`。
