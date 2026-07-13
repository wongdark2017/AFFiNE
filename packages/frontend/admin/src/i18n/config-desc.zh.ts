/**
 * Chinese overlay for config descriptor descriptions.
 *
 * Keys are the ConfigRow field paths assembled in `modules/settings/index.tsx`:
 * `${module}/${key}` plus `/${sub}` for sub fields (e.g. `server/name`,
 * `storages/blob.storage/provider`). The generated `src/config.json` stays
 * untouched; fields missing here fall back to the English description, so
 * regenerating config via the server's genconfig script is always safe.
 */
export const CONFIG_DESC_ZH: Record<string, string> = {
  // server
  'server/name': '服务器的显示名称，使用 AFFiNE 桌面端连接时会展示给用户。',
  'server/externalUrl':
    'AFFiNE 服务器的基础 URL，用于生成外部访问链接。未指定时默认为 `[server.protocol]://[server.host][:server.port]`。',
  'server/https': '服务器是否部署在启用了 SSL 的域名上（https://）。',
  'server/host': '服务器部署所在的主机名（FQDN）。',
  'server/hosts': '服务器接受请求的多个主机名。',
  'server/listenAddr': '服务器监听地址（例如 IPv4 用 0.0.0.0，IPv6 用 ::）。',
  'server/port': '服务器监听的端口。',
  'server/path': '服务器部署的子路径（如有），例如 /affine。',

  // auth
  'auth/allowSignup': '是否允许新用户注册。',
  'auth/allowSignupForOauth': '是否允许通过已配置的 OAuth 注册新用户。',
  'auth/requireEmailDomainVerification':
    '访问受限资源前是否要求邮箱域名记录验证。',
  'auth/requireEmailVerification':
    '访问受限资源前是否要求邮箱验证（尚未实现）。',
  'auth/newAccountShareActionDelay':
    '新账号可邀请成员或创建分享链接前所需的最短注册时长（秒）。',
  'auth/trustedCloudflareHeaders':
    '判定请求滥用来源时是否信任来自源站边缘的 Cloudflare 请求头。',
  'auth/inviteQuotaShadowMode':
    '工作区邀请配额是否只记录"将被拦截"的决策，而不实际拒绝请求或执行滥用处置。',
  'auth/inviteQuotaFailOpenOnRuntimeError':
    '原生运行时准入不可用时，工作区邀请配额是否放行（fail open）。生产环境请保持关闭。',
  'auth/passwordRequirements': '设置新密码时的密码强度要求。',
  'auth/passwordRequirements/min': '密码最小长度要求',
  'auth/passwordRequirements/max': '密码最大长度要求',
  'auth/session.ttl': '应用登录态的过期时间（秒）。',
  'auth/session.ttr': '应用登录态的刷新间隔（秒）。',

  // mailer
  'mailer/SMTP.name':
    'SMTP HELO/EHLO 使用的主机名（例如 mail.example.com），留空则使用系统主机名。',
  'mailer/SMTP.host': '邮件服务器地址（例如 smtp.gmail.com）',
  'mailer/SMTP.port': '邮件服务器端口（常见为 25、465 或 587）',
  'mailer/SMTP.username': '邮件服务器认证用户名',
  'mailer/SMTP.password': '邮件服务器认证密码',
  'mailer/SMTP.sender':
    '所有邮件的发件人（例如 "AFFiNE Self Hosted <noreply@example.com>"）',
  'mailer/SMTP.ignoreTLS':
    '是否忽略邮件服务器的 TLS 证书校验。使用自签名证书时可开启。',
  'mailer/fallbackDomains': '来自这些域名的邮件始终使用后备 SMTP 服务器发送。',
  'mailer/deliveryWorker.batchSize': '每个投递 worker 单次处理的邮件行数。',
  'mailer/deliveryWorker.leaseMs': '邮件投递 worker 的租约时长（毫秒）。',
  'mailer/deliveryWorker.retentionDays': '匿名化的终态邮件投递台账保留天数。',
  'mailer/fallbackSMTP.name':
    '后备 SMTP HELO/EHLO 使用的主机名（例如 mail.example.com），留空则使用系统主机名。',
  'mailer/fallbackSMTP.host': '后备邮件服务器地址（例如 smtp.gmail.com）',
  'mailer/fallbackSMTP.port': '后备邮件服务器端口（常见为 25、465 或 587）',
  'mailer/fallbackSMTP.username': '后备邮件服务器认证用户名',
  'mailer/fallbackSMTP.password': '后备邮件服务器认证密码',
  'mailer/fallbackSMTP.sender':
    '后备服务器发送邮件的发件人（例如 "AFFiNE Self Hosted <noreply@example.com>"）',
  'mailer/fallbackSMTP.ignoreTLS':
    '是否忽略后备邮件服务器的 TLS 证书校验。使用自签名证书时可开启。',

  // storages
  'storages/blob.storage/provider': '用户上传文件（blob）的存储提供方',
  'storages/blob.storage/bucket': '用户上传文件的存储桶（bucket）名称',
  'storages/blob.storage/config':
    '存储提供方的 S3 兼容配置（endpoint/region/凭证）。',
  'storages/avatar.storage/provider': '用户头像的存储提供方',
  'storages/avatar.storage/bucket': '用户头像的存储桶（bucket）名称',
  'storages/avatar.storage/config':
    '存储提供方的 S3 兼容配置（endpoint/region/凭证）。',
  'storages/avatar.publicPath':
    '用户头像的公开访问路径前缀（例如 https://my-bucket.s3.amazonaws.com/）',
  'storages/avatar.storage': '用户头像的存储配置。',
  'storages/blob.storage': '所有上传文件（图片、视频等）的存储配置。',

  // oauth
  'oauth/providers.google': 'Google OAuth 提供方配置',
  'oauth/providers.github': 'GitHub OAuth 提供方配置',
  'oauth/providers.oidc': 'OIDC OAuth 提供方配置',
  'oauth/providers.apple': 'Apple OAuth 提供方配置',

  // copilot (AI)
  'copilot/enabled':
    '是否启用 AI（copilot）插件。<br> 文档：<a href="https://docs.affine.pro/self-host-affine/administer/ai" target="_blank">https://docs.affine.pro/self-host-affine/administer/ai</a>',
  'copilot/byok.enabled': '是否启用工作区 BYOK（自带密钥）。',
  'copilot/byok.allowedProviders': '工作区 BYOK 允许的提供方列表。',
  'copilot/byok.allowCustomEndpoint': '是否接受工作区 BYOK 自定义端点。',
  'copilot/providers.profiles': 'AI 提供方的 profile 列表。',
  'copilot/providers.defaults':
    '各模型输出类型的默认提供方 ID 及全局回退设置。',
  'copilot/providers.openai': 'OpenAI 提供方配置。',
  'copilot/providers.cloudflareWorkersAi': 'Cloudflare Workers AI 提供方配置。',
  'copilot/providers.fal': 'fal 提供方配置。',
  'copilot/providers.gemini': 'Gemini 提供方配置。',
  'copilot/providers.geminiVertex': 'Google Vertex AI 上的 Gemini 提供方配置。',
  'copilot/providers.anthropic': 'Anthropic 提供方配置。',
  'copilot/providers.anthropicVertex':
    'Google Vertex AI 上的 Anthropic 提供方配置。',
  'copilot/unsplash': 'Unsplash 密钥配置。',
  'copilot/exa': 'Exa 网页搜索密钥配置。',
  'copilot/storage': 'AI 文件存储提供方配置。',
  'copilot/storage/provider': 'AI 文件（copilot blob）的存储提供方',
  'copilot/storage/bucket': 'AI 文件的存储桶（bucket）名称',
  'copilot/storage/config':
    '存储提供方的 S3 兼容配置（endpoint/region/凭证）。',

  // crypto
  'crypto/privateKey': '加密模块用于创建签名令牌或加密数据的私钥。',

  // job
  'job/queue': '任务队列配置',
  'job/worker': '任务 worker 配置',
  'job/queues.copilot': 'AI（copilot）任务队列配置',
  'job/queues.calendar': '日历任务队列配置',
  'job/queues.doc': '文档任务队列配置',
  'job/queues.indexer': '索引任务队列配置',
  'job/queues.notification': '通知任务队列配置',
  'job/queues.nightly': '每日定时任务队列配置',
  'job/queues.backendRuntime': '后端运行时任务队列配置',
  'job/queues.inviteAbuse': '邀请滥用处置任务队列配置',

  // throttle
  'throttle/enabled': '是否启用限流器。',
  'throttle/throttlers.default': '默认限流器配置。',
  'throttle/throttlers.strict': '严格限流器配置。',

  // doc
  'doc/experimental.yocto': '使用 Yjs 合并更新时同时用 `y-octo` 进行合并。',
  'doc/history.interval': '文档更新时创建新历史快照的最小时间间隔（毫秒）。',

  // permission
  'permission/readModel': 'Rust 权限评估使用的权限数据源',
  'permission/fallbackLegacyLoader':
    '投影加载器（projection loader）输入加载失败时，是否回退到旧版加载器',

  // websocket
  'websocket/transports': '接受 WebSocket 流量所启用的传输方式。',
  'websocket/maxHttpBufferSize':
    '单条消息允许的最大字节数/字符数，超过则关闭会话（防止 DoS）。',

  // flags
  'flags/allowGuestDemoWorkspace': '是否允许访客用户创建演示工作区。',

  // docService
  'docService/endpoint': '文档服务（doc service）的端点地址。',

  // client
  'client/versionControl.enabled': '客户端访问服务器前是否检查其版本。',
  'client/versionControl.requiredVersion':
    '允许访问服务器的应用版本范围。需要开启 client/versionControl.enabled 才会生效。',

  // calendar
  'calendar/google': 'Google 日历集成配置',
  'calendar/caldav': 'CalDAV 集成配置',

  // indexer
  'indexer/enabled': '是否启用索引（indexer）插件',
  'indexer/provider.type': '索引搜索服务提供方名称',
  'indexer/provider.endpoint': '索引搜索服务端点',
  'indexer/provider.apiKey':
    '索引搜索服务 API key。使用 Elasticsearch 时可不填',
  'indexer/provider.username':
    '索引搜索服务认证用户名，不设置则禁用 basic auth。使用 Elasticsearch 时可不填',
  'indexer/provider.password':
    '索引搜索服务认证密码，不设置则禁用 basic auth。使用 Elasticsearch 时可不填',
  'indexer/autoIndex.batchSize': '每批自动建立索引的工作区数量',

  // worker
  'worker/allowedOrigin': '允许的跨域来源（origin）',

  // metrics（自托管默认隐藏）
  'metrics/enabled': '是否启用指标与链路追踪采集',

  // telemetry（自托管默认隐藏）
  'telemetry/allowedOrigin': '允许采集遥测数据的来源（origin）。',
  'telemetry/ga4.measurementId': 'GA4 Measurement Protocol 的 Measurement ID。',
  'telemetry/ga4.apiSecret': 'GA4 Measurement Protocol 的 API secret。',
  'telemetry/dedupe.ttlHours': '遥测去重 TTL（小时）。',
  'telemetry/dedupe.maxEntries': '遥测去重最大条目数。',
  'telemetry/batch.maxEvents': '每个遥测批次的最大事件数。',

  // captcha（自托管默认隐藏）
  'captcha/enabled': '用户登录时是否进行人机验证（captcha）。',
  'captcha/config': 'captcha 插件配置。',

  // payment（自托管默认隐藏）
  'payment/enabled': '是否启用支付插件',
  'payment/showLifetimePrice': '是否展示买断价并允许用户购买。',
  'payment/stripe': 'Stripe SDK 选项与凭证',
  'payment/revenuecat': 'RevenueCat 集成配置',
};
