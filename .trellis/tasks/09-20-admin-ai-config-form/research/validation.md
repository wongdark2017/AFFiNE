# 正式实现与验收记录

## 最终结果

- 管理后台正式生产构建通过：`node tools/cli/bin/runner.js affine.ts bundle -p @affine/admin`。本地输出位于 `packages/frontend/admin/dist`，未上传或部署。构建仅报告资源/入口体积建议警告。
- 管理员全量测试：15 个文件、84 项通过，包括真实 `SettingsPage → CopilotSettings → useAppConfig` 页面闭环和保存期间禁用控件回归。
- 后端 helper 测试：24 项通过，包含真实本机 HTTP 聊天请求、输出限制、共享超时、兼容参数回退、响应校验及安全错误。
- 后端 HTTP 权限测试：17 项全部通过，包含未登录、非管理员、Cookie CSRF 缺失/错误、跨站表单、已认证管理员 JWT，以及探测和生产 URL 一致性。
- 管理员和服务端 TypeScript 检查通过；本任务修改文件的 ESLint、Prettier、限定范围 diff 检查通过。
- Trellis 的 implement/check 上下文清单已补齐并通过校验。

## 已验收行为

- AI 配置逐字段回填、编辑和保存；保留未展示配置；取消还原且重新遮挡密钥。
- 模型发现使用未保存草稿，支持搜索选择与手动输入；失败/空结果和过期请求行为已覆盖。
- 连通测试使用当前模型发简短聊天请求，显示成功耗时或固定安全错误，不保存配置；配置变化后旧结果失效。
- AI 分组保存中所有控件被禁用，成功/失败后解锁，失败保留草稿。
- 兼容接口生产调用与探测共同规范基础地址，避免多余斜线导致双 `/v1`。
- 浏览器预览已确认分组标题完整位于卡片内，说明/输入框左对齐；390px 窄屏自动单列。

## 本机测试依赖

之前缺失的 `server-native.arm64.node` 问题已经解除：从当前源码构建 `affine_server_native`，将动态库作为本地 `server-native.node` 加载，Node 实际加载成功。未修改全局 Cargo 配置；临时使用官方 crates 索引并关闭 HTTP/2 复用，绕过机器已有不可用镜像。所有构建产物均在 Git 忽略范围。

后端测试通过临时 AVA 配置使用仓库 TypeScript loader，规避已有相对 prelude 路径解析问题：

- `/tmp/affine-connection-helper-ava.config.mjs`
- `/tmp/affine-connection-http-ava.config.mjs`

## 交付边界

代码已接入实际管理后台和后端模块。`http://127.0.0.1:4178/` 仍是明确标注的模拟预览，不联系真实模型服务。未使用截图中的真实密钥，未改运行中服务端配置；未提交、推送或部署。

已有的 `byok/service.ts`、workspace chat 和其他任务改动不在本次提交范围。全仓 diff-check 发现该既有 byok 文件的尾空格，未更改；本任务范围内检查通过。
