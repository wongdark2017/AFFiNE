# 执行计划：TikZ 渲染集成

> 前置：design.md 已核实全部接入点。资产来源定为 **npm 包**（不 vendor 二进制进仓库）：
> - `node-tikzjax@1.0.5`（LPPL-1.3c）：只取资产 `tex/tex.wasm.gz`(122KB)、`tex/core.dump.gz`(3.2MB)、`tex/tex_files.tar.gz`(1.4MB)、`css/fonts.css` + `css/bakoma/ttf/*`，并改编其 `dist/library.js`（web2js 运行时，LPPL，源头 kisonecat/tikzjax → artisticat1 fork）
> - `@prinsss/dvi2html@0.0.1`（**GPL-3.0**）：DVI→SVG，纯 JS（仅依赖 buffer polyfill），worker 可用
>
> **License 核实结论（step 0，已完成）**：LPPL-1.3c 允许分发（改编文件需标注出处与修改）；`@prinsss/dvi2html` 为 GPL-3.0——本次为自托管私有部署，不构成对外分发，可用；若未来上游化/对外分发需法务复核。bakoma 字体带独立 LICENCE（随 npm 包分发）。以上记录到 vendor 文件头注释。

## Phase 1 — 依赖与资产

- [ ] 1. `packages/frontend/core/package.json` 增加依赖 `node-tikzjax`、`@prinsss/dvi2html`、`buffer`；`yarn install`
- [ ] 2. 确认 `new URL('node-tikzjax/tex/core.dump.gz', import.meta.url)` 能被 rspack 解析为 asset（node-tikzjax 无 exports 限制，已核实）

## Phase 2 — renderer 模块 `packages/frontend/core/src/modules/tikz/renderer/`

- [ ] 3. `types.ts`：`TikzRenderOptions/TikzRenderRequest/TikzRenderResult/TikzOps`（对照 typst/renderer/types.ts）
- [ ] 4. `library.ts`：改编自 node-tikzjax `dist/library.js`（头注释标 LPPL 出处与修改点；Buffer 用 `buffer` polyfill 或 Uint8Array 重写）
- [ ] 5. `runtime.ts`：浏览器 bootstrap ——
  - 资产 URL 用 `new URL(..., import.meta.url)`，可注入覆盖（供 Node 测试）
  - gunzip 用 `DecompressionStream('gzip')`；`tex_files.tar.gz` 用自写迷你 ustar 解析器展开进 `Map<string, Uint8Array>`
  - 预处理用户代码：提取顶部 `\usepackage`/`\usetikzlibrary` 行进 preamble；缺 `\begin{document}` 则包裹；缺 tikzpicture 且是裸命令时包 `\begin{tikzpicture}`
  - `tex()` 跑 wasm 引擎 → DVI → `@prinsss/dvi2html` → 从 HTML 输出中提取 `<svg>...</svg>` 字符串（不用 jsdom/svgo；下游有 sanitizeSvg）
  - pgf id 去重 patch（照抄 node-tikzjax dvi2svg 的 hash 重命名逻辑，md5 换简单 hash）
  - 串行渲染队列（TeX WASM 非重入）；渲染失败抛带 TeX log 摘要的错误（含"宏包不支持"提示词）
- [ ] 6. `tikz.worker.ts`（OpConsumer：init/render）+ `index.ts`（`TikzRenderer extends WorkerOpRenderer<TikzOps>('tikz')`，`getTikzRenderer()`）
- [ ] 7. 单测 `runtime.spec.ts`：纯函数（preamble 提取/包裹、svg 提取、tar 解析）+ **Node 集成用例**：从 node_modules 读三个资产喂给 runtime，渲染基础 tikzpicture / pgfplots / tikz-cd，断言输出含 `<svg`（Node≥18 有 DecompressionStream/WebAssembly）

## Phase 3 — 桥接（加行）

- [ ] 8. `modules/code-block-preview-renderer/types.ts`：Request/Result map 加 `tikz`
- [ ] 9. `platform-backend.ts` + `.desktop.ts` + `.mobile.ts`：`renderTikzSvgBackend`
- [ ] 10. `bridge.ts`：`renderTikzSvg`（sanitizeSvg 包一层，照抄 typst 三行结构）

## Phase 4 — 预览组件与注册

- [ ] 11. `view-extensions/code-block-preview/tikz-preview.ts`：复制 typst-preview.ts 骨架；差异：
  - 调 `renderTikzSvg`
  - 暗色适配：svg 字符串 `black/#000→currentColor`、`white/#fff→var(--affine-background-primary-color)`（obsidian 同款）
  - 首次渲染时注入一次 `node-tikzjax/css/fonts.css`（import css 交给 rspack 处理 140 个 ttf url → asset/resource 规则已存在）
  - 错误态文案含"可能使用了未预打包的宏包"提示
- [ ] 12. `code-block-preview/index.ts`：effect() 注册自定义元素 + setup() 注册 `CodeBlockTikzPreview`
- [ ] 13. 语言表：同一 setup 里注册 `CodeBlockConfigExtension`，langs = `[...bundledLanguagesInfo, tikz 条目]`；tikz 条目复用 latex 语法（clone latex grammar 改 name='tikz'，避免 shiki 名字不匹配）；核实 `code-block.ts:116` 归一化路径

## Phase 5 — /tikz 斜杠菜单

- [ ] 14. `view-extensions/tikz/slash-menu.ts`：`SlashMenuConfigExtension('tikz', ...)`，插入模式照抄 callout（`store.addBlock('affine:code', {language:'tikz', preview:true, text: new Text(模板)}, parent, index+1)`，原段落为空则删除，focus 新块）；name 'TikZ Diagram'，searchAlias ['tikz','latex','pgf','绘图']，group '4_Content & Media@9'
- [ ] 15. 注册进 `CodeBlockPreviewViewExtension.setup`（不动 manager/view.ts）

## Phase 6 — 构建配置

- [ ] 16. `tools/cli/src/bundle.ts`：`includeMermaidAndTypst` 分支追加 tikz.worker 条目；核实 CLI 走 src 还是 dist（若走 dist 需同步重建/直改 dist）

## Phase 7 — 质量检查（2.2）

- [ ] 17. `yarn typecheck`（或 tsc -b 对应 project）+ eslint 改动文件
- [ ] 18. vitest：新增 spec + 既有 `code-block-preview-renderer`/`typst`/`mermaid` spec 全绿（回归）
- [ ] 19. `yarn affine @affine/web build` 本地过一遍：确认 dist 出现 tikz worker、wasm.gz/dump.gz/tar.gz 资产、bakoma 字体

## Phase 8 — 部署与线上验证（3.x 前置）

- [ ] 20. 按既有流水线：diff scp → `ubuntu@192.168.122.34:/home/ubuntu/AFFiNE`（跳板 `root@103.217.203.235`）→ 远程 `yarn install` + `yarn affine @affine/web build` + docker build 新 tag → `.env` AFFINE_REVISION → `docker compose up -d`
- [ ] 21. 线上验证 PRD 验收单：/tikz 菜单、四类用例（tikzpicture/pgfplots/circuitikz/tikz-cd）、错误态、暗色主题、typst/mermaid/html 回归

## 回滚点

- 本地任意阶段：`git checkout -- <files>`；新文件直接删除
- 远程：恢复 `.env` 备份 + 旧 tag `docker compose up -d`

## 验证命令

```bash
yarn typecheck
yarn workspace @affine/core vitest run src/modules/tikz src/modules/code-block-preview-renderer
yarn affine @affine/web build && ls packages/frontend/apps/web/dist/js | grep tikz
```
