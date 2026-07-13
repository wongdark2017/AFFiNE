# 配置 desc 盘点（module.key → 英文 desc）

> 来源: src/config.json (genconfig 生成) — config.ts 内联覆盖另见文末

## metrics

- `metrics.enabled` [Boolean] Enable metric and tracing collection

## crypto

- `crypto.privateKey` [String] The private key for used by the crypto module to create signed tokens or encrypt data.

## job

- `job.queue` [Object] The config for job queues
- `job.worker` [Object] The config for job workers
- `job.queues.copilot` [Object] The config for copilot job queue
- `job.queues.calendar` [Object] The config for calendar job queue
- `job.queues.doc` [Object] The config for doc job queue
- `job.queues.indexer` [Object] The config for indexer job queue
- `job.queues.notification` [Object] The config for notification job queue
- `job.queues.nightly` [Object] The config for nightly job queue
- `job.queues.backendRuntime` [Object] The config for backend runtime job queue
- `job.queues.inviteAbuse` [Object] The config for invite abuse disposition job queue

## throttle

- `throttle.enabled` [Boolean] Whether the throttler is enabled.
- `throttle.throttlers.default` [Object] The config for the default throttler.
- `throttle.throttlers.strict` [Object] The config for the strict throttler.

## auth

- `auth.allowSignup` [Boolean] Whether allow new registrations.
- `auth.allowSignupForOauth` [Boolean] Whether allow new registrations via configured oauth.
- `auth.requireEmailDomainVerification` [Boolean] Whether require email domain record verification before accessing restricted resources.
- `auth.requireEmailVerification` [Boolean] Whether require email verification before accessing restricted resources(not implemented).
- `auth.newAccountShareActionDelay` [Number] Minimum account age in seconds before new accounts can invite members or create share links.
- `auth.trustedCloudflareHeaders` [Boolean] Whether request abuse source facts should trust Cloudflare headers from the origin edge.
- `auth.inviteQuotaShadowMode` [Boolean] Whether workspace invite quota should record would-block decisions without rejecting requests or executing abuse actions.
- `auth.inviteQuotaFailOpenOnRuntimeError` [Boolean] Whether workspace invite quota should fail open when native runtime admission is unavailable. Keep disabled for production.
- `auth.passwordRequirements` [Object] The password strength requirements when set new password.
- `auth.session.ttl` [Number] Application auth expiration time in seconds.
- `auth.session.ttr` [Number] Application auth time to refresh in seconds.

## mailer

- `mailer.SMTP.name` [String] Hostname used for SMTP HELO/EHLO (e.g. mail.example.com). Leave empty to use the system hostname.
- `mailer.SMTP.host` [String] Host of the email server (e.g. smtp.gmail.com)
- `mailer.SMTP.port` [Number] Port of the email server (they commonly are 25, 465 or 587)
- `mailer.SMTP.username` [String] Username used to authenticate the email server
- `mailer.SMTP.password` [String] Password used to authenticate the email server
- `mailer.SMTP.sender` [String] Sender of all the emails (e.g. "AFFiNE Self Hosted &lt;noreply@example.com&gt;")
- `mailer.SMTP.ignoreTLS` [Boolean] Whether ignore email server's TLS certificate verification. Enable it for self-signed certificates.
- `mailer.fallbackDomains` [Array] The emails from these domains are always sent using the fallback SMTP server.
- `mailer.deliveryWorker.batchSize` [Number] Number of mail delivery rows claimed by each worker tick.
- `mailer.deliveryWorker.leaseMs` [Number] Mail delivery worker lease duration in milliseconds.
- `mailer.deliveryWorker.retentionDays` [Number] Days to retain anonymized terminal mail delivery ledger rows.
- `mailer.fallbackSMTP.name` [String] Hostname used for fallback SMTP HELO/EHLO (e.g. mail.example.com). Leave empty to use the system hostname.
- `mailer.fallbackSMTP.host` [String] Host of the email server (e.g. smtp.gmail.com)
- `mailer.fallbackSMTP.port` [Number] Port of the email server (they commonly are 25, 465 or 587)
- `mailer.fallbackSMTP.username` [String] Username used to authenticate the email server
- `mailer.fallbackSMTP.password` [String] Password used to authenticate the email server
- `mailer.fallbackSMTP.sender` [String] Sender of all the emails (e.g. "AFFiNE Self Hosted &lt;noreply@example.com&gt;")
- `mailer.fallbackSMTP.ignoreTLS` [Boolean] Whether ignore email server's TLS certificate verification. Enable it for self-signed certificates.

## doc

- `doc.experimental.yocto` [Boolean] Use `y-octo` to merge updates at the same time when merging using Yjs.
- `doc.history.interval` [Number] The minimum time interval in milliseconds of creating a new history snapshot when doc get updated.

## permission

- `permission.readModel` [String] Permission data source for Rust evaluation
- `permission.fallbackLegacyLoader` [Boolean] Fallback from projection loader to legacy loader when projection input loading fails

## storages

- `storages.avatar.publicPath` [String] The public accessible path prefix for user avatars.
- `storages.avatar.storage` [Object] The config of storage for user avatars.
- `storages.blob.storage` [Object] The config of storage for all uploaded blobs(images, videos, etc.).

## websocket

- `websocket.transports` [Array] The enabled transports for accepting websocket traffics.
- `websocket.maxHttpBufferSize` [Number] How many bytes or characters a message can be, before closing the session (to avoid DoS).

## server

- `server.name` [String] A recognizable name for the server. Will be shown when connected with AFFiNE Desktop.
- `server.externalUrl` [String] Base url of AFFiNE server, used for generating external urls.
  Default to be `[server.protocol]://[server.host][:server.port]` if not specified.
- `server.https` [Boolean] Whether the server is hosted on a ssl enabled domain (https://).
- `server.host` [String] Where the server get deployed(FQDN).
- `server.hosts` [Array] Multiple hosts the server will accept requests from.
- `server.listenAddr` [String] The address to listen on (e.g., 0.0.0.0 for IPv4, :: for IPv6).
- `server.port` [Number] Which port the server will listen on.
- `server.path` [String] Subpath where the server get deployed if there is one.(e.g. /affine)

## flags

- `flags.allowGuestDemoWorkspace` [Boolean] Whether allow guest users to create demo workspaces.

## docService

- `docService.endpoint` [String] The endpoint of the doc service.

## telemetry

- `telemetry.allowedOrigin` [Array] Allowed origins for telemetry collection.
- `telemetry.ga4.measurementId` [String] GA4 Measurement ID for Measurement Protocol.
- `telemetry.ga4.apiSecret` [String] GA4 API secret for Measurement Protocol.
- `telemetry.dedupe.ttlHours` [Number] Telemetry dedupe TTL in hours.
- `telemetry.dedupe.maxEntries` [Number] Telemetry dedupe max entries.
- `telemetry.batch.maxEvents` [Number] Max events per telemetry batch.

## client

- `client.versionControl.enabled` [Boolean] Whether check version of client before accessing the server.
- `client.versionControl.requiredVersion` [String] Allowed version range of the app that allowed to access the server. Requires 'client/versionControl.enabled' to be true to take effect.

## calendar

- `calendar.google` [Object] Google Calendar integration config
- `calendar.caldav` [Object] CalDAV integration config

## captcha

- `captcha.enabled` [Boolean] Check captcha challenge when user authenticating the app.
- `captcha.config` [Object] The config for the captcha plugin.

## copilot

- `copilot.enabled` [Boolean] Whether to enable the copilot plugin. <br> Document: <a href="https://docs.affine.pro/self-host-affine/administer/ai" target="_blank">https://docs.affine.pro/self-host-affine/administer/ai</a>
- `copilot.byok.enabled` [Boolean] Whether to enable workspace BYOK.
- `copilot.byok.allowedProviders` [Array] The allowlist for workspace BYOK providers.
- `copilot.byok.allowCustomEndpoint` [Boolean] Whether workspace BYOK custom endpoints are accepted.
- `copilot.providers.profiles` [Array] The profile list for copilot providers.
- `copilot.providers.defaults` [Object] The default provider ids for model output types and global fallback.
- `copilot.providers.openai` [Object] The config for the openai provider.
- `copilot.providers.cloudflareWorkersAi` [Object] The config for the Cloudflare Workers AI provider.
- `copilot.providers.fal` [Object] The config for the fal provider.
- `copilot.providers.gemini` [Object] The config for the gemini provider.
- `copilot.providers.geminiVertex` [Object] The config for the gemini provider in Google Vertex AI.
- `copilot.providers.anthropic` [Object] The config for the anthropic provider.
- `copilot.providers.anthropicVertex` [Object] The config for the anthropic provider in Google Vertex AI.
- `copilot.unsplash` [Object] The config for the unsplash key.
- `copilot.exa` [Object] The config for the exa web search key.
- `copilot.storage` [Object] The config for the storage provider.

## indexer

- `indexer.enabled` [Boolean] Enable indexer plugin
- `indexer.provider.type` [String] Indexer search service provider name
- `indexer.provider.endpoint` [String] Indexer search service endpoint
- `indexer.provider.apiKey` [String] Indexer search service api key. Optional for elasticsearch
- `indexer.provider.username` [String] Indexer search service auth username, if not set, basic auth will be disabled. Optional for elasticsearch
- `indexer.provider.password` [String] Indexer search service auth password, if not set, basic auth will be disabled. Optional for elasticsearch
- `indexer.autoIndex.batchSize` [Number] Number of workspaces automatically indexed per batch

## oauth

- `oauth.providers.google` [Object] Google OAuth provider config
- `oauth.providers.github` [Object] GitHub OAuth provider config
- `oauth.providers.oidc` [Object] OIDC OAuth provider config
- `oauth.providers.apple` [Object] Apple OAuth provider config

## payment

- `payment.enabled` [Boolean] Whether enable payment plugin
- `payment.showLifetimePrice` [Boolean] Whether enable lifetime price and allow user to pay for it.
- `payment.stripe` [Object] Stripe sdk options and credentials
- `payment.revenuecat` [Object] RevenueCat integration configs

## worker

- `worker.allowedOrigin` [Array] Allowed origin

---

TOTAL: 107

- config.ts:10: desc: string;
- config.ts:62: desc: 'Minimum account age in seconds before new accounts can invite members or create share links.',
- config.ts:69: desc: 'Minimum length requirement of password',
- config.ts:75: desc: 'Maximum length requirement of password',
- config.ts:99: desc: 'The storage provider for user uploaded blobs',
- config.ts:108: desc: 'The bucket name for user uploaded blobs storage',
- config.ts:114: desc: 'The S3 compatible config for the storage provider (endpoint/region/credentials).',
- config.ts:118: desc: 'The storage provider for user avatars',
- config.ts:127: desc: 'The bucket name for user avatars storage',
- config.ts:133: desc: 'The S3 compatible config for the storage provider (endpoint/region/credentials).',
- config.ts:138: desc: 'The public path prefix for user avatars(e.g. https://my-bucket.s3.amazonaws.com/)',
- config.ts:160: desc: 'The storage provider for copilot blobs',
- config.ts:169: desc: 'The bucket name for copilot blobs storage',
- config.ts:175: desc: 'The S3 compatible config for the storage provider (endpoint/region/credentials).',
