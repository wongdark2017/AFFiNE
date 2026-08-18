# Code Block Preview Renderers

How language-specific preview renderers (html / mermaid / typst / **tikz**) plug into the
code block, and how to add a new one. All paths relative to `packages/frontend/core/src`.

## Architecture

```
affine-code block (blocksuite/affine/blocks/code)
  └─ CodeBlockPreviewIdentifier(model.props.language)  ← exact language-id match
       └─ <xxx-preview> Lit component (blocksuite/view-extensions/code-block-preview/xxx-preview.ts)
            └─ bridge.renderXxxSvg()                    ← sanitizeSvg here, single choke point
                 └─ platform-backend[.desktop|.mobile].ts  ← per-platform dispatch
                      └─ modules/xxx/renderer/          ← WorkerOpRenderer client + OpConsumer worker
```

- **Preview toggle** appears automatically once `CodeBlockPreviewExtension(lang, renderer)` is
  registered; the `preview` boolean is a persisted prop of the code block model.
- **Renderers are lazy**: the worker spawns on first `render()` call; heavy assets (wasm etc.)
  load inside the worker, never on first paint.
- **Workers must be declared** in `tools/cli/src/bundle.ts` (`getBaseWorkerConfigs`) or the
  `getWorkerUrl(name)` fetch 404s. Worker name = file basename minus `.worker.ts`.
  Note: `@affine/electron-renderer`, iOS and Android exclude the mermaid/typst/tikz workers
  (`includeMermaidAndTypst: false`); their platform backends dispatch to native/electron
  handlers, which must exist or throw a clear "unavailable" error.
- **Asset self-hosting**: reference package assets with `new URL('pkg/path/file', import.meta.url)`
  — rspack emits them hashed into dist (worker `publicPath` is `/`). No CDN.

## Adding a renderer for language `foo`

1. `modules/foo/renderer/{types,runtime,foo.worker,index}.ts` — copy the typst/tikz shape:
   `FooOps extends OpSchema` with `init`/`render`, worker `OpConsumer`, client
   `class FooRenderer extends WorkerOpRenderer<FooOps>` + `getFooRenderer()` singleton.
2. `modules/code-block-preview-renderer/`: add `foo` to `types.ts` maps; add
   `renderFooSvgBackend` to all three `platform-backend*.ts`; add `renderFooSvg` (with
   `sanitizeSvg`) to `bridge.ts`.
3. `blocksuite/view-extensions/code-block-preview/foo-preview.ts`: Lit component (200ms debounce,
   loading/error/fallback states) + `CodeBlockPreviewExtension('foo', ...)`; register the custom
   element in `index.ts` `effect()` and the extension in `setup()`.
4. If `foo` is not a shiki bundled language, extend `langs.ts` (see below).
5. Add the worker entry in `tools/cli/src/bundle.ts`.
6. e2e: `tests/affine-local/e2e/blocksuite/code/crud.spec.ts` — heavy first renders need
   `test.setTimeout(180_000)` (default 30s kills them in dev mode).

## Non-shiki languages (`langs.ts`)

`code-block-preview/langs.ts` registers `CodeBlockConfigExtension` with
`[...bundledLanguagesInfo, <custom entries>]`. Custom entries clone an existing shiki grammar and
rename it (the highlighter resolves grammars by the code block's language id, so the registered
grammar's `name` must equal the entry `id`). ⚠️ `CodeBlockConfigExtension` **overrides** the whole
`affine:code` DI config: mobile's `showLineNumbers: false` (set by `CodeBlockViewExtension`) must
be re-supplied here, since this extension registers later and wins.

## TikZ specifics

- Engine: vendored web2js TeX runtime (`modules/tikz/renderer/library.ts`, LPPL-1.3c, adapted
  from node-tikzjax) + assets from the `node-tikzjax` npm package (`tex.wasm.gz`,
  `core.dump.gz`, `tex_files.tar.gz`) + `@prinsss/dvi2html` (**GPL-3.0** — fine for self-host
  deployment; re-check licensing before upstreaming/distribution).
- `runtime.ts` gunzips via `DecompressionStream`, untars with a minimal ustar reader, runs TeX
  per render on a fresh 68MB WebAssembly.Memory (engine is not reentrant — renders are queued
  serially), converts DVI→SVG via dvi2html, and appends the missing `</svg>` (node-tikzjax
  relies on jsdom auto-closing; we string-patch instead).
- User code is normalized by `prepareTexInput`: `\usepackage`/`\usetikzlibrary`/`\pgfplotsset`
  lines are hoisted into the preamble, bare commands get a `tikzpicture` wrapper, everything is
  wrapped in `\begin{document}`. Bundled packages: tikz, pgfplots, circuitikz, chemfig, tikz-cd,
  tikz-3dplot, array, amsmath/text/fonts/symb.
- Text glyphs need the bakoma `@font-face` set: `tikz-preview.ts` imports
  `node-tikzjax/css/fonts.css` (rspack bundles the 140 ttf files as assets).
- Dark mode: `adaptTikzSvgColors` rewrites black→`currentColor`, white→background var.
- `/tikz` slash item: `blocksuite/view-extensions/tikz/slash-menu.ts` inserts an
  `affine:code` block with `language: 'tikz', preview: true` and a template.
- Node integration tests (`modules/tikz/renderer/runtime.spec.ts`) drive the full TeX→SVG
  pipeline headless — start there when debugging rendering.
