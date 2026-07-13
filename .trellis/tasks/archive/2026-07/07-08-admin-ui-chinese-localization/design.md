# 技术设计：Admin 轻量 i18n 层

## 边界

只改 `packages/frontend/admin`。新增 `src/i18n/` 目录，其余改动是把硬编码英文替换为 `t(...)` 调用与配置 desc 的查表覆盖。

## 核心决策

### 1. 以英文原文为 key（source-string lookup），不发明 key 体系

```ts
// src/i18n/index.ts
export function t(text: string): string {
  return dict[text] ?? text; // 查不到 → 原文即英文回退
}
```

- 111 个文件的替换只需 `'Save Changes'` → `t('Save Changes')`，churn 最小；
- 英文回退天然成立（Requirement 3），后端新增配置项自动回退；
- 代价：英文原文变更会使翻译失效——可接受，且可用词典 key 与代码扫描比对来发现（见 implement.md 的 audit 脚本）。

带插值的文案（如 `` `${count} users` ``）改为 `t('{count} users', { count })` 形式，`t` 支持简单 `{name}` 占位符替换；数量少，不引入复数规则。

### 2. 配置 desc 用独立 overlay，按 `module.key` 查表

```ts
// src/i18n/config-desc.zh.ts
export const CONFIG_DESC_ZH: Record<string, string> = {
  'server.name': '服务器名称，展示给终端用户',
  'auth.passwordRequirements.min': '密码最小长度要求',
  // ...
};
```

接入点是**读取 descriptor 的地方**，即 `src/modules/settings/index.tsx:178-194` 组装 `desc` 处（同时覆盖 `config.json` 生成值与 `config.ts` 内联覆盖值）：

```ts
desc: translateConfigDesc(`${module}.${fieldKey}`, field.desc ?? descriptor.desc);
```

`translateConfigDesc(id, fallback)` 查 overlay，未命中返回英文 fallback。`config.json` 与 `config.ts` 的英文 desc 一律不动；`config-input-row.tsx` 的 `dangerouslySetInnerHTML` 渲染不变，翻译文案中的 HTML 链接照常生效。设置分组名（`KNOWN_CONFIG_GROUPS[].name`，如 `'Server'`/`'Auth'`）走普通 `t()`。

### 3. 语言判定：默认中文，留扩展点

```ts
const locale = localStorage.getItem('admin:locale') ?? (navigator.language.startsWith('zh') ? 'zh' : 'en');
```

`t` 在 `locale === 'en'` 时直接返回原文。不做切换 UI（out of scope），但英文用户浏览器下自动保持英文，行为安全。

### 4. 词典文件组织

```
src/i18n/
  index.ts          // t()、translateConfigDesc()、locale 判定
  zh.ts             // UI 文案词典（英文原文 → 中文），按模块分段注释
  config-desc.zh.ts // 配置 desc overlay（module.key → 中文）
```

不引入 React Context/Provider：locale 在页面加载时确定、运行期不切换，纯函数即可，避免 111 个文件的组件树改造。

## 与现有规范的一致性

- 测试：新增 `src/i18n/index.spec.ts`（纯函数，node 环境即可）；受影响的 RTL 断言（`settings/index.spec.tsx` 等断言英文文案处）同步改为断言中文或改用 role/testid。遵循 `.trellis/spec/testing/index.md`（root vitest glob 自动收集，无需新配置）。
- admin 使用 Tailwind/shadcn 风格组件（区别于 core 的 vanilla-extract），本任务不触碰样式。

## 兼容与回滚

- 回滚 = revert admin 包内改动；无数据、无 API、无后端影响。
- genconfig 重新生成 `config.json` 后：新增配置项英文回退显示，翻译不丢失（overlay 独立）。
- 风险点：`t()` 漏包导致个别英文残留 —— 用 audit 脚本（grep JSX 内裸英文字符串）收敛；不影响功能。

## 已否决的备选

- 直接改 `config.json` / 后端 desc：会被 genconfig 覆盖或污染 API 输出。
- 接入 `@affine/i18n`：admin 与其零耦合，改造面与包体积代价大，超出"配置提示中文化"的需求。
