# PRD: TikZ 渲染集成

## Goal

对齐 siyuan-embed-tikz 的核心体验：文档中通过 `/tikz` 插入 TikZ 代码块，浏览器端离线渲染为 SVG，支持 pgfplots / circuitikz / chemfig / tikz-cd 等常用宏包。

## Requirements

- `/tikz` 斜杠命令插入 language=tikz、preview 开启的代码块（带初始模板）
- tikz 代码块可在代码/预览间切换（复用现有 preview 按钮机制）
- 渲染纯客户端完成（TikZJax WASM），资产自托管进 dist，无 CDN/服务端依赖
- 渲染失败展示明确错误态（含"宏包不支持"提示）
- typst / mermaid / html 现有预览零回归

## Acceptance Criteria

- [ ] `/tikz` 菜单项出现并可插入模板代码块
- [ ] 基础 tikzpicture、pgfplots、circuitikz、tikz-cd 四类用例渲染成功
- [ ] 错误代码显示错误态而非白屏/卡死
- [ ] 暗色主题下图形可读
- [ ] 现有三种代码块预览回归通过
- [ ] 部署到测试环境并线上验证

## Notes

技术设计见 design.md；实现前先完成 tikzjax 上游 license 核实（design.md §5 第一条）。
