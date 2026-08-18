# Journal - wongdark2017 (Part 1)

> AI development session journal
> Started: 2026-07-08

---

## Session 1: Admin 界面中文化（轻量 i18n 层）

**Date**: 2026-07-09
**Task**: Admin 界面中文化（轻量 i18n 层）
**Branch**: `feat/admin-zh-localization`

### Summary

为 packages/frontend/admin 落地轻量 i18n 层：t() 英文原文为 key、中文词典 325 条、config desc overlay 118 条；全部 UI 文案与配置提示默认中文、英文回退；生成物 config.json 零改动。验证：admin 33 测试 + 全仓 vitest + typecheck 通过，词典/占位符 audit 零缺失。遗留：需本地起服务人工走查（PRD 验收最后一项）。

### Main Changes

(Add details)

### Git Commits

| Hash        | Message       |
| ----------- | ------------- |
| `df8743e03` | (see git log) |
| `88778b439` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete

---

## Session 2: TikZ 渲染集成（离线 WASM TeX + /tikz 斜杠命令）

**Date**: 2026-07-15
**Task**: .trellis/tasks/07-14-tikz-integration
**Branch**: `dev-main`

### Summary

落地 TikZ 代码块预览：vendor node-tikzjax 的 web2js TeX 运行时（LPPL-1.3c，改编为 TS/浏览器 worker），资产（tex.wasm/core dump/tex_files + bakoma 字体）走 npm 包自托管进 dist；DVI→SVG 用 @prinsss/dvi2html（GPL-3.0，自托管部署可用，上游化需复核）。第四个 preview renderer 接入现有 code-block-preview 架构（零 blocksuite 核心改动），自定义 shiki 语言条目复用 latex 语法，`/tikz` 斜杠项插入 preview=true 模板块。

### Main Changes

- 新增 `modules/tikz/renderer/`（types/library/runtime/worker/index + 12 个 Node 集成测试，四类用例 tikzpicture/pgfplots/circuitikz/tikz-cd 全渲染通过）
- 桥接 `code-block-preview-renderer/*` 加 tikz 键；desktop/mobile 走 handler 缺省报错
- `view-extensions/code-block-preview/{tikz-preview,langs}.ts` + `view-extensions/tikz/slash-menu.ts`
- `tools/cli/src/bundle.ts` 注册 tikz.worker；e2e 两条（slash 插入渲染 + 错误态）
- 关键坑：dvi2html 输出缺 `</svg>`（node-tikzjax 靠 jsdom 自动闭合，我们字符串补齐）；CodeBlockConfigExtension 是 override 语义，mobile 的 showLineNumbers:false 要在 langs 注册里补回

### Git Commits

| Hash        | Message       |
| ----------- | ------------- |
| `1503d0fdb` | fix(server): drop unused ts-expect-error in copilot e2e |
| `8cb2937b6` | feat(core): offline TikZ rendering for code blocks with /tikz slash command |

### Testing

- [OK] typecheck（全仓 0 error）、eslint、prettier
- [OK] vitest：tikz 12/12、code-block-preview-renderer 13/13
- [OK] e2e（dev server）：/tikz 插入渲染 ✓、错误态 ✓、html/typst/语言切换回归 ✓（mermaid e2e 在基线即失败，环境问题非回归）
- [OK] 本地 `yarn affine @affine/web build`：tikz worker + 3 个 gz 资产 + 182 ttf 进 dist

### Status

[OK] **Completed**

### Deployment

- 远程构建：`ubuntu@192.168.122.34` snapshot commit `8800709`，`yarn affine @affine/web build`
- 镜像：`ghcr.io/toeverything/affine:tikz-8800709`（.env 备份为 `.env.bak-tikz-*`，回滚 = 恢复 `AFFINE_REVISION=unified-959aad0` + compose up）
- 线上验证（http://103.217.203.235:3010）：worker + 3 个 TeX 资产 HTTP 200；playwright 冒烟 light/dark 两主题 /tikz 插入并渲染成功（截图 scratchpad/live-tikz-{light,dark}.png）

### Next Steps

- None - task complete（备忘：mermaid preview e2e 在本地环境基线即失败，与本任务无关；桌面/移动原生端 tikz 走 handler 缺省报"不支持"，后续如需要再实现）
