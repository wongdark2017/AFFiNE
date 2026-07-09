# Admin 界面中文化（轻量 i18n 层）

## Goal

为 `packages/frontend/admin` 引入轻量级 i18n 字典层，将全部 UI 文案与配置提示本地化为中文：默认显示中文、英文自动回退，不改动后端 genconfig 生成链路。

## Background（已核实的事实）

- admin 包（111 个 tsx 文件）目前**没有任何 i18n 基础设施**：无 `@affine/i18n`/i18next 依赖，所有文案硬编码英文。
- 设置页的"配置提示"有两个来源：
  1. `packages/frontend/admin/src/config.json` —— 由 `packages/backend/server/scripts/genconfig.ts` 从服务端 `defineModuleConfig` 的 `desc` 生成的**生成物**，直接修改会在下次生成时被覆盖；
  2. `packages/frontend/admin/src/modules/settings/config.ts` 中 `KNOWN_CONFIG_GROUPS` 的内联 `desc` 覆盖。
- desc 在 `src/modules/settings/config-input-row.tsx:192` 以 `dangerouslySetInnerHTML` 渲染（可含 HTML/链接）。
- admin 已有组件测试（vitest + RTL + happy-dom），部分断言英文文案（如 `src/modules/settings/index.spec.tsx` 的 `'Server Name'`、`'Allow Signup'`）。

## Requirements

1. **UI 文案中文化**：admin 所有可见文案（导航、页头、dashboard、accounts、workspaces、ai、queue、settings、setup、auth、about、toast/错误提示、确认弹窗、按钮、空态）默认显示中文。
2. **配置提示中文化**：设置页每个配置项的名称/描述显示中文，覆盖 `config.json` 生成的 desc 与 `config.ts` 内联 desc 两个来源；含 HTML/链接的描述保持链接可用。
3. **英文回退**：任何未翻译的字符串（含后端新增配置项）原样显示英文，不出现空白、key 名或渲染错误。
4. **不破坏生成链路**：`src/config.json` 保持为生成物不做人工修改；重新运行 genconfig 不会丢失翻译（翻译位于独立 overlay 文件）。
5. **语言判定**：默认中文即可（本任务面向自托管中文场景）；实现上保留按浏览器语言/localStorage 切换的扩展点，但语言切换 UI 不在本期范围。
6. **不改动**：后端 `defineModuleConfig` 的英文 desc、主应用 `@affine/i18n` 体系、admin 之外的任何包。

## Acceptance Criteria

- [ ] 启动 admin（自托管模式），逐页走查：导航、Dashboard、Accounts、Workspaces、AI、Queue、Settings（全部配置组）、Setup、登录页、About —— 可见文案均为中文。
- [ ] Settings 页所有配置项描述为中文；`config.ts` 内联 desc（如密码长度、账号邀请延迟）与 `config.json` 生成 desc 均被覆盖；带链接的描述点击可用。
- [ ] 人为构造一个字典中不存在的文案/配置项，界面回退显示英文原文。
- [ ] `git diff` 不包含 `src/config.json` 的改动；翻译全部位于新增的 i18n/overlay 文件。
- [ ] `yarn test`（root vitest，含 admin 的 \*.spec.tsx）、`yarn typecheck` 通过；断言英文文案的既有测试已同步更新。
- [ ] 新增 i18n 工具函数有单元测试（命中翻译、英文回退、config desc overlay 查找）。

## Out of Scope

- 语言切换 UI、除中文外的其他语种。
- 接入 `@affine/i18n` / i18next。
- 后端配置 desc 源头（register.ts / genconfig.ts）的任何改动。
- 主应用（packages/frontend/core）的中文化。
