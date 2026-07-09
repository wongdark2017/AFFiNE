# 执行计划：Admin 界面中文化

> 前置：`python3 ./.trellis/scripts/task.py start 07-08-admin-ui-chinese-localization` 之后才开始实现。
> 分支建议：`feat/admin-zh-localization`，基于 `canary`。

## 阶段 0：文案盘点（研究，不改代码）

- [x] 脚本扫描 `packages/frontend/admin/src` 中 JSX 文本节点、常见属性（`title`/`placeholder`/`label`/`description`）与 toast 调用里的英文字符串，产出清单到本任务 `research/strings-inventory.md`（按模块分组，含文件:行号）。
- [x] 从 `src/config.json` + `src/modules/settings/config.ts` 提取全部 `module.key → desc` 清单到 `research/config-desc-inventory.md`。
- 验证：清单条目数与 grep 抽查一致；两份清单进入 review。

## 阶段 1：i18n 基建

- [x] 新建 `src/i18n/index.ts`：`t(text, params?)`（英文原文为 key、`{name}` 占位符、未命中回退原文）、`translateConfigDesc(id, fallback)`、locale 判定（`localStorage['admin:locale']` → `navigator.language`，zh\* 默认中文）。
- [x] 新建 `src/i18n/zh.ts`（UI 词典骨架）与 `src/i18n/config-desc.zh.ts`（overlay 骨架）。
- [x] 单测 `src/i18n/index.spec.ts`：命中翻译 / 回退 / 占位符 / en locale 直通 / overlay 查找。
- 验证：`yarn vitest packages/frontend/admin/src/i18n --run` 通过。
- 回滚点：仅新增文件，可整体删除。

## 阶段 2：配置提示接入（核心价值，先做）

- [x] 在 `src/modules/settings/index.tsx` 组装 descriptor 处（~178-194 行）接入 `translateConfigDesc`；分组名（`KNOWN_CONFIG_GROUPS[].name`）与设置页自身文案走 `t()`。
- [x] 按阶段 0 清单填充 `config-desc.zh.ts` 全量翻译（自托管可见模块优先：server/auth/mailer/storages/client/oauth；`IGNORED_MODULES` 中 payment/captcha/telemetry/metrics 可跳过）。
- [x] 更新 `src/modules/settings/index.spec.tsx`、`config-input-row.spec.tsx` 中的英文断言。
- 验证：dev 起 admin 走查 Settings 全部分组；含链接的 desc（如 S3 config）可点击。
- review 门：翻译术语抽查（storage/bucket/OAuth 等保留英文原词还是意译，先在 PR 里定 glossary）。

## 阶段 3：UI 文案逐模块替换

按模块提交，每模块一个 commit，顺序：

- [x] `nav/` + `header.tsx` + `layout.tsx` + `panel/`（全局壳）
- [x] `settings/`（operations、send-test-email 等剩余文案）
- [x] `accounts/`（表格列、增删改弹窗、toast）
- [x] `dashboard/`、`workspaces/`、`queue/`
- [x] `ai/`、`auth/`、`setup/`、`about/`、`common.ts` 及零散 hooks（`use-mutation.ts` 错误 toast）
- 每步验证：该模块页面走查 + 相关 spec 通过。
- 回滚点：任一模块 commit 可独立 revert。

## 阶段 4：收尾与验证

- [x] audit：重跑阶段 0 扫描脚本，比对残留英文（允许清单：品牌词、日志、testid）。
- [x] 全量：`yarn test`、`yarn typecheck`、`yarn lint:eslint packages/frontend/admin --no-cache` 或 root `yarn lint`。
- [x] 确认 `git status` 中 `src/config.json` 无改动。
- [ ] 按 PRD 验收清单逐条走查（含英文回退用例）——需要本地起服务人工走查，未在本次会话执行。
- [x] 更新 `.trellis/spec/frontend/index.md` 的 admin 一行，注明 admin 已有本地 i18n 层及其位置。

## 验证命令汇总

```bash
yarn vitest packages/frontend/admin --run   # admin 相关 spec
yarn test                                   # root vitest 全量
yarn typecheck
yarn dev   # 选 @affine/web + server，或 admin dev 入口，人工走查
```
