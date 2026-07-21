# Hook 规范 — `@affine/core`（延后）

最小启动集有意延后完整 hooks 目录。

为表单/功能加 hooks 时，优先已有辅助：

- `useAsyncCallback` — `packages/frontend/core/src/components/hooks/affine-async-hooks`
- `useI18n` — `@affine/i18n`
- `useService` / `useLiveData` — `@toeverything/infra`

仅当多种新 hook 模式出现且有清晰示例时再扩展本文件。
