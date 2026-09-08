# 提交计划（已确认）

已确认一个提交：`fix(core): prevent endless workspace loading`

内容：读取与来源完成状态、异常/超时页面、安全操作、移动菜单受控状态、回归测试、相关规范及任务记录。

提交钩子运行全仓 oxlint 时发现 dev-main 原有的 5 处 lint 错误，涉及 3 个文件。本次补充最小修正：Copilot 导出排序，TikZ 显式使用 npm Buffer 包、合并重复数字输出、简化文件名处理。补跑 TikZ 既有测试、core 类型检查和 Web 构建；保留正常提交钩子。

验证：91 项单元/组件测试、3 项桌面 E2E、2 项 Mobile Chrome E2E、TypeScript、ESLint、oxlint、Web 构建通过。构建有资源体积警告。

## 文件范围

- `.trellis/spec/core/frontend/index.md`
- `.trellis/spec/core/frontend/workspace-root-loading.md`
- `.trellis/spec/nbstore/frontend/index.md`
- `.trellis/tasks/09-07-workspace-missing-root-loading/check.jsonl`
- `.trellis/tasks/09-07-workspace-missing-root-loading/commit-plan.md`
- `.trellis/tasks/09-07-workspace-missing-root-loading/design.md`
- `.trellis/tasks/09-07-workspace-missing-root-loading/implement.jsonl`
- `.trellis/tasks/09-07-workspace-missing-root-loading/implement.md`
- `.trellis/tasks/09-07-workspace-missing-root-loading/prd.md`
- `.trellis/tasks/09-07-workspace-missing-root-loading/research/code-map.md`
- `.trellis/tasks/09-07-workspace-missing-root-loading/research/validation.md`
- `.trellis/tasks/09-07-workspace-missing-root-loading/runnable-test.md`
- `.trellis/tasks/09-07-workspace-missing-root-loading/task.json`
- `package.json`
- `packages/common/nbstore/src/__tests__/root-load.spec.ts`
- `packages/common/nbstore/src/frontend/doc.ts`
- `packages/common/nbstore/src/sync/doc/index.ts`
- `packages/common/nbstore/src/sync/doc/peer.ts`
- `packages/frontend/component/src/ui/menu/mobile/root.spec.tsx`
- `packages/frontend/component/src/ui/menu/mobile/root.tsx`
- `packages/frontend/core/src/components/workspace-load-failure/index.spec.tsx`
- `packages/frontend/core/src/components/workspace-load-failure/index.tsx`
- `packages/frontend/core/src/components/workspace-load-failure/styles.css.ts`
- `packages/frontend/core/src/components/workspace-selector/index.tsx`
- `packages/frontend/core/src/desktop/components/app-container/index.tsx`
- `packages/frontend/core/src/desktop/pages/workspace/index.tsx`
- `packages/frontend/core/src/mobile/components/workspace-selector/index.tsx`
- `packages/frontend/core/src/mobile/pages/workspace/layout.tsx`
- `packages/frontend/core/src/modules/app-sidebar/views/index.tsx`
- `packages/frontend/core/src/modules/workspace/index.ts`
- `packages/frontend/core/src/modules/workspace/services/root-load.ts`
- `packages/frontend/core/src/modules/workspace/utils/root-load-state.spec.ts`
- `packages/frontend/core/src/modules/workspace/utils/root-load-state.ts`
- `packages/frontend/i18n/src/i18n-completenesses.json`
- `packages/frontend/i18n/src/i18n.gen.ts`
- `packages/frontend/i18n/src/resources/en.json`
- `packages/frontend/i18n/src/resources/zh-Hans.json`
- `tests/affine-local/e2e/workspace-load-failure.spec.ts`
- `tests/affine-local/playwright.workspace-loading.config.ts`
- `tests/affine-mobile/e2e/workspace-load-failure.spec.ts`

- `packages/backend/server/src/plugins/copilot/providers/index.ts`
- `packages/frontend/core/src/modules/tikz/renderer/library.ts`
- `packages/frontend/core/src/modules/tikz/renderer/runtime.ts`

## 排除项

本修复工作树内未发现其他人留下的未识别改动。主工作区原有的 BYOK service.ts 和其他任务/文档改动不在本次提交范围内。

2026-09-08 用户已明确授权提交并推送到 `origin/codex/fix-workspace-missing-root-loading`。不部署。
