# 实现文档：AFFiNE 集成 TikZ 渲染

> 目标：对齐 [siyuan-embed-tikz](https://github.com/YuxinZhaozyx/siyuan-embed-tikz) 的核心体验——在文档里写 TikZ 代码，浏览器端离线渲染成 SVG 矢量图，支持 pgfplots / circuitikz / chemfig / tikz-cd 等常用宏包；入口为 `/tikz` 斜杠命令。

## 1. 技术选型

**渲染引擎：TikZJax（浏览器 WASM TeX）**，与思源插件同一技术族。

| 方案 | 优点 | 缺点 | 结论 |
|---|---|---|---|
| TikZJax 浏览器 WASM | 纯客户端、离线、零服务端改动；与仓库现有 typst/mermaid 预览架构一致；Obsidian 同款方案（数万用户验证） | 宏包支持限于预打包集合（约 15 个常用包）；资产 ~10MB 进 web dist | **采用** |
| 服务端 texlive 渲染 | 宏包 100% 支持 | 镜像膨胀数百 MB～GB（当前网络环境不可接受）；需新增渲染端点、队列、超时管控 | 备选，不做 |

资产来源：vendor [artisticat1/obsidian-tikzjax](https://github.com/artisticat1/obsidian-tikzjax) 使用的 tikzjax 构建产物（`tikzjax.js` + `tex.wasm` + `core.dump.gz` + `fonts.css`），预打包宏包含 pgfplots、circuitikz、chemfig、tikz-cd、tikz-3dplot、array 等，与思源插件宣称列表基本重合。
⚠️ 落地前须核实上游 license（obsidian-tikzjax 为 MIT，但 tikzjax 本体的 license 声明历史上不完整——实现第一步先确认，必要时换 fork 或自行构建）。

## 2. 现有架构接入点（已核实源码）

AFFiNE dev-main 已有完整的"代码块预览"插件机制，typst / mermaid / html 三个渲染器就挂在上面，TikZ 作为第四个渲染器接入，**零核心改动**：

| 接入点 | 位置 | 机制 |
|---|---|---|
| 预览注册 | `blocksuite/affine/blocks/code/src/code-preview-extension.ts:18` | `CodeBlockPreviewExtension(lang, renderer)` 按语言 id 注册 DI |
| 预览匹配 | `blocksuite/affine/blocks/code/src/code-block.ts:421` | `CodeBlockPreviewIdentifier(model.props.language)` 精确匹配语言 id |
| 预览开关 | `code-toolbar/components/preview-button.ts:82` + `model.props.preview`（布尔属性，持久化在文档里） | 语言有注册的渲染器时代码块工具栏自动出现预览按钮 |
| 渲染器参照 | `packages/frontend/core/src/blocksuite/view-extensions/code-block-preview/typst-preview.ts` | Lit 组件：200ms 防抖、loading/error 态、`sanitizeSvg` 后注入 |
| WASM 加载参照 | `packages/frontend/core/src/modules/typst/renderer/runtime.ts:30` | `new URL('...bg.wasm', import.meta.url)` → rspack 自动打进 dist（自托管、无 CDN 依赖） |
| Worker 桥参照 | `modules/typst/renderer/typst.worker.ts` | `@toeverything/infra/op` 的 OpConsumer/OpClient 模式 |
| 语言列表 | `code-block.ts:89` `CodeBlockConfigExtension.langs ?? bundledLanguagesInfo`（shiki） | shiki **没有 `tikz`**（有 latex/tex），需注册自定义语言条目 |
| 斜杠菜单 | `blocksuite/affine/widgets/slash-menu/src/extensions.ts:42` `SlashMenuConfigExtension(id, config)` | 上一轮已调研，多方注册自动合并 |

## 3. 实现设计

### 3.1 新模块 `packages/frontend/core/src/modules/tikz/renderer/`

```
tikz/renderer/
├── index.ts          # getTikzRenderer()：worker 客户端（OpClient），参照 typst/renderer/index.ts
├── runtime.ts        # TikZJax 初始化 + renderTikzSvg(code, options)
├── tikz.worker.ts    # OpConsumer worker（init/render 两个 op）
├── types.ts          # TikzRenderRequest / TikzRenderResult / TikzOps
└── vendor/           # tikzjax 资产：tex.wasm、core.dump.gz、fonts.css（+ LICENSE 说明）
```

- `runtime.ts` 用 `new URL('./vendor/tex.wasm', import.meta.url)` 方式引用资产（同 typst 的做法，构建期进 dist）。
- TikZJax 输入需要包一层标准模板：用户只写 `\begin{tikzpicture}...\end{tikzpicture}` 或裸 tikz 命令，运行时拼 `\usepackage{...}`（从代码首行注释或固定预置解析，v1 先固定预置 + 识别代码内的 `\usepackage`，与思源插件行为一致）。
- 渲染输出为 SVG 字符串；经现有 `sanitizeSvg`（`bridge.ts`）净化后展示；tikzjax 的文字字形依赖 `fonts.css`，随组件样式注入一次。
- 并发控制：与 typst 相同，单 worker + 渲染队列串行（TeX WASM 非重入）。

### 3.2 桥接（2 处小改）

- `modules/code-block-preview-renderer/types.ts`：`PreviewRenderRequestMap/ResultMap` 增加 `tikz` 键。
- `platform-backend.ts`（含 desktop/mobile 变体）：加 `renderTikzSvgBackend` → `getTikzRenderer().render(request)`；`bridge.ts` 加 `renderTikzSvg`（带 sanitize），完全照抄 typst 的三行结构。

### 3.3 预览组件（新文件）

`view-extensions/code-block-preview/tikz-preview.ts`：复制 `typst-preview.ts` 骨架改名——`CodeBlockPreviewExtension('tikz', model => html`<tikz-preview .model=${model}></tikz-preview>`)`，200ms 防抖调 `renderTikzSvg`，loading/error/fallback 三态样式直接复用。
在 `code-block-preview/index.ts` 的 `effect()`/`setup()` 里各加一行注册。

### 3.4 语言注册 `tikz`

预览按 `model.props.language === 'tikz'` 匹配，而语言选择器的候选来自 shiki（无 tikz）。通过 `CodeBlockConfigExtension` 提供扩展语言表：

```ts
// 在 editor-config 或 code-block-preview 的 view extension setup 里
langs: [
  ...bundledLanguagesInfo,
  {
    id: 'tikz',
    name: 'TikZ',
    aliases: ['pgf'],
    import: () => import('@shikijs/langs/latex'), // 语法高亮复用 latex 语法
  },
]
```

注意 `code-block.ts:116` 的匹配逻辑会把 model.language 归一化为 `info.id`，自定义条目结构需符合 shiki `BundledLanguageInfo` 形状（id/name/aliases/import）。需确认现网是否已有地方注册过 `CodeBlockConfigExtension`（若有则合并而不是覆盖）。

### 3.5 `/tikz` 斜杠菜单项（新文件）

`view-extensions/my-tools/` → 正式命名 `view-extensions/tikz/slash-menu.ts`：

```ts
SlashMenuConfigExtension('tikz', {
  items: [{
    name: 'TikZ 图形',
    searchAlias: ['tikz', 'latex', 'pgf', '绘图'],
    icon: ..., group: '4_Content & Media@99',
    action: ({ std, model }) => {
      // 在当前块后插入 affine:code 块，language='tikz'，preview=true，
      // 并预填一个 \begin{tikzpicture} 模板，光标定位到代码块内
    },
  }],
})
```

注册进 3.3 的同一个 view extension（或独立 Provider 加入 `manager/view.ts:85` 列表）。

### 3.6 移动端 & 桌面端

`platform-backend.mobile.ts` / `.desktop.ts` 与 web 同构（typst 已是三端同代码），无额外工作；桌面端后续随 electron 构建自然生效（本次只部署 web）。

## 4. 文件清单

**新增**
- `packages/frontend/core/src/modules/tikz/renderer/{index,runtime,types,tikz.worker}.ts` + `vendor/*`
- `packages/frontend/core/src/blocksuite/view-extensions/code-block-preview/tikz-preview.ts`
- `packages/frontend/core/src/blocksuite/view-extensions/tikz/slash-menu.ts`

**修改（均为加行）**
- `modules/code-block-preview-renderer/{types,platform-backend,platform-backend.desktop,platform-backend.mobile,bridge}.ts`
- `view-extensions/code-block-preview/index.ts`（注册 tikz preview + 语言表扩展）
- `manager/view.ts`（若走独立 Provider）

**不动**：blocksuite 包、后端、原生模块。

## 5. 风险与对策

| 风险 | 对策 |
|---|---|
| tikzjax license 不明 | 第一步核实；不行则换有明确 license 的 fork 或用 web2js 自构建；最坏退化为服务端渲染方案再评估 |
| 资产体积（wasm+dump ≈ 10MB） | 懒加载：仅当文档里真的出现 tikz 预览时才拉起 worker/下载资产（typst 已是惰性初始化，同款）；首屏无影响 |
| SVG 文字字形（cmr 字体） | 随渲染结果注入 fonts.css；无文字的纯图形不受影响 |
| 暗色主题 | tikzjax 输出黑色线条，暗色下需 `filter: invert(...)` 或 CSS 变量适配（Obsidian 插件同款处理），组件样式里处理 |
| 宏包超出预打包集合 | 渲染错误态里明确提示"宏包不支持"，对齐思源插件的说明口径 |
| WASM 在低配移动端的内存 | 渲染队列串行 + 渲染完成后可选择性释放（v1 不做，观察） |

## 6. 验证方案

1. 本地 `yarn affine @affine/web build` + 预览页手测：`/tikz` 插入 → 默认模板渲染出图；改代码 → 防抖重渲染；错误代码 → 错误态展示
2. 覆盖用例：基础 tikzpicture、pgfplots 函数图、circuitikz 电路、tikz-cd 交换图、中文文本节点（预期字体缺失，记录为已知限制）
3. 回归：typst / mermaid / html 预览不受影响；语言选择器里 latex/tex 正常
4. 部署测试环境后线上复测 + 暗色主题检查

## 7. 部署

走现有远程流水线：源码 diff scp → 远程 `yarn install`（缓存命中）→ `yarn affine @affine/web build`（注意 **web** 是新目标，之前只重建过 admin/server；mobile 如需要一并）→ docker build → 切 `.env` → compose up。资产自托管在 dist 内，无需网络出口。

## 8. 工作量估算

| 步骤 | 估算 |
|---|---|
| license 核实 + 资产 vendor | 0.5h |
| renderer 模块（worker+runtime） | 2-3h（含 tikzjax 初始化调试） |
| 预览组件 + 注册 + 语言表 | 1h |
| slash 菜单项 | 0.5h |
| 本地联调验证 | 1-2h |
| 远程构建部署 + 线上验证 | ~1h（多为流水线等待） |

合计一个工作日内可交付到测试环境。
