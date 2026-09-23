# 模型发现设计

保留已完成的 AI 分组表单，扩展 OpenAI 兼容接口的默认模型编辑器。

## 交互

当前密钥、地址齐备时可点击“获取模型”。手动输入始终可用；获取成功后提供可搜索模型列表，不自动覆盖已有默认模型。地址/密钥变更会清空列表并中止旧请求，重试显式触发。

## 数据链路与契约

表单草稿 → 同源 `affineFetch` → `POST /api/copilot/admin/models` → 对方 `/v1/models` → `{ models: string[] }` → 用户选择 → 现有配置子字段更新。

- 请求 JSON：`{ apiKey: string, baseURL: string }`，不需要 defaultModel，不持久化。
- 仅登录管理员可请求，复用 Admin guard 和严格限流。
- 只接受 HTTP/HTTPS 基础地址，拒绝 URL 内嵌凭据、查询参数和片段；允许本地服务地址。
- 复用公共模型列表获取函数，让现有 runtime 缓存流程和管理员草稿查询保持 URL/解析一致。
- 规范尾斜线和 `/v1`，Bearer header，超时10秒，禁止重定向携带凭据；模型ID去重，响应格式校验。
- 预期失败使用项目 BadRequest 错误，固定文案覆盖鉴权失败、无列表接口、限流、超时、连接失败、无效数据；不得回显上游正文/密钥。
- 查询成功不改变配置；仅用户选择才更新默认模型，已有列表外模型仍可手动保存。

## 验证与边界

前端验证未保存草稿、加载/失败/空结果、选择/手输、过期结果失效。后端用本地 mock 上游验证 URL、header、超时、格式和失败路径；验证管理员授权拒绝。预览只使用明确标注的示例列表，不使用截图中真实密钥。

## 连接测试扩展

卡片底部新增 `OpenAICompatibleConnectionTest`，通过同源 `POST /api/copilot/admin/test-connection` 发送 `{apiKey, baseURL, defaultModel}`。服务器向配置的 `/v1/chat/completions` 发短请求，限制生成量、总超时20秒，不保存配置或请求内容。成功返回 `{model: string, latencyMs: number}`；失败复用项目 BadRequest 和固定安全文案，不回显上游文本。按钮明确提示使用当前配置和会产生少量模型用量。

测试状态独立于表单dirty状态；三项配置变化或组件卸载时取消/忽略旧请求。成功必须收到有效聊天响应，而非仅HTTP200。预览用显式模拟响应，真实调用仅在部署后由用户点击。
