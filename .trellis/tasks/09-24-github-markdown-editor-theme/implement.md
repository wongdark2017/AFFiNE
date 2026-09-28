# GitHub Markdown editor theme and CSS import implementation plan

> **For AI implementation workers:** execute through the Trellis `trellis-implement` workflow. Follow the tasks in order, use test-first development, and do not commit from the worker session; the main session commits after independent `trellis-check` review.

**Goal:** Ship a GitHub-style default document-body theme in every build and add Canary-only, safe light/dark CSS imports to the existing visual theme editor.

**Architecture:** Static PageEditor styles provide the built-in light/dark theme. A lazy PostCSS normalizer converts allowed AFFiNE/Typora rules into mode-scoped sanitized CSS, which `ThemeEditorService` stores locally and a feature-gated runtime style element applies. Existing visual variable overrides remain a final layer.

**Technical stack:** TypeScript, Lit CSS, React, `@toeverything/infra` LiveData/GlobalState, PostCSS selector/value parsers, Vitest, Playwright, vanilla-extract, bundled WOFF2 fonts.

---

## File map

### Create

- `packages/frontend/core/src/blocksuite/editors/editor-markdown-theme.ts` — built-in scoped light/dark Lit CSS.
- `packages/frontend/core/src/modules/theme-editor/css-import/constants.ts` — size, selector, property, at-rule, and font allowlists.
- `packages/frontend/core/src/modules/theme-editor/css-import/errors.ts` — typed import failures.
- `packages/frontend/core/src/modules/theme-editor/css-import/normalize.ts` — parse, detect, translate, sanitize, report, serialize.
- `packages/frontend/core/src/modules/theme-editor/css-import/normalize.spec.ts` — importer contract tests.
- `packages/frontend/core/src/desktop/pages/theme-editor/components/css-import-panel.tsx` — light/dark import screen.
- `packages/frontend/core/src/desktop/pages/theme-editor/components/css-import-card.tsx` — one mode's actions/status/report.
- `packages/frontend/core/src/desktop/pages/theme-editor/components/css-import.css.ts` — import panel layout.
- `packages/frontend/component/src/fonts/open-sans/*` — licensed webfont assets and notice.
- `packages/frontend/component/src/fonts/nunito-sans/*` — licensed webfont assets and notice.
- `packages/frontend/component/src/fonts/noto-sans-sc/*` — licensed CJK webfont assets and notice.
- `packages/frontend/component/src/fonts/noto-serif-sc/*` — licensed CJK webfont assets and notice.

### Modify

- `packages/frontend/core/package.json` and `yarn.lock` — direct lazy importer dependencies.
- `packages/frontend/component/src/theme/fonts.css` — editor font faces.
- `packages/frontend/core/src/blocksuite/editors/page-editor.ts` — compose built-in body theme.
- `packages/frontend/core/src/modules/theme-editor/types.ts` — versioned import state/report types.
- `packages/frontend/core/src/modules/theme-editor/services/theme-editor.ts` — local state and atomic lifecycle methods.
- `packages/frontend/core/src/modules/theme-editor/index.ts` — public types/importer exports as required.
- `packages/frontend/core/src/desktop/pages/root/custom-theme/index.tsx` — feature-gated runtime CSS and editor-scoped variable override layer.
- `packages/frontend/core/src/desktop/pages/theme-editor/theme-editor.tsx` — add Imported CSS navigation without removing V1/V2.
- `packages/frontend/i18n/src/resources/en.json` and `zh-Hans.json` — user-facing import text.
- `packages/frontend/i18n/src/i18n.gen.ts` — regenerated keys.
- `tests/affine-local/e2e/theme.spec.ts` — default theme and import lifecycle coverage.

## Task 1: Define the import data contract

**Files:**

- Modify: `packages/frontend/core/src/modules/theme-editor/types.ts`
- Create: `packages/frontend/core/src/modules/theme-editor/css-import/errors.ts`

- [ ] Add the versioned state and report types exactly once:

```ts
export type EditorThemeMode = 'light' | 'dark';

export type CssImportReport = {
  sourceKind: 'affine' | 'typora' | 'generic';
  appliedRules: number;
  translatedRules: number;
  ignoredRules: number;
  rejectedDeclarations: number;
  warnings: string[];
};

export type ImportedEditorStylesheet = {
  fileName: string;
  byteLength: number;
  importedAt: number;
  enabled: boolean;
  sanitizedCss: string;
  report: CssImportReport;
};

export type ImportedEditorThemeState = {
  version: 1;
  light?: ImportedEditorStylesheet;
  dark?: ImportedEditorStylesheet;
};
```

- [ ] Define typed error codes for invalid extension, oversize, unreadable text, parse failure, zero supported rules, and persistence failure.
- [ ] Run formatter/type checking for the touched files; expected result is no diagnostics.

## Task 2: Build the CSS normalizer test-first

**Files:**

- Modify: `packages/frontend/core/package.json`, `yarn.lock`
- Create: `packages/frontend/core/src/modules/theme-editor/css-import/constants.ts`
- Create: `packages/frontend/core/src/modules/theme-editor/css-import/normalize.ts`
- Create: `packages/frontend/core/src/modules/theme-editor/css-import/normalize.spec.ts`

- [ ] Add direct dependencies: `postcss`, `postcss-selector-parser`, and `postcss-value-parser`.
- [ ] Write failing tests for:
  - `512 * 1024` bytes accepted and one additional byte rejected;
  - converted output capped at 1 MiB;
  - malformed CSS rejected;
  - `:root`, `html`, `body`, `#write`, headings, paragraph, quote, list, code, table, link, divider, image, and math mappings;
  - already-scoped AFFiNE selectors retained only when allowlisted;
  - Typora chrome/CodeMirror selectors ignored;
  - `@import`, `@font-face`, `url(...)`, fixed overlays, z-index escape, and `!important` stripped/reported;
  - Open Sans/Nunito/Noto/Inter/code families retained and unknown leading families removed;
  - light/dark output receives the matching editor prefix and remains unlayered so it can override existing unlayered BlockSuite rules;
  - deterministic output and report counts;
  - zero supported rules rejected.
- [ ] Run the test and verify it fails because `normalizeEditorThemeCss` is missing.

```bash
node .yarn/releases/yarn-4.13.0.cjs vitest --run packages/frontend/core/src/modules/theme-editor/css-import/normalize.spec.ts
```

- [ ] Implement this public contract:

```ts
export const MAX_EDITOR_THEME_CSS_BYTES = 512 * 1024;

export function normalizeEditorThemeCss(input: { mode: EditorThemeMode; fileName: string; css: string; byteLength: number }): { sanitizedCss: string; report: CssImportReport };
```

- [ ] Use PostCSS AST walking; never execute source CSS. Use selector/value parsers for mappings and URL/font inspection.
- [ ] Preserve safe `@media`/`@supports`; drop all other at-rules listed in the design.
- [ ] Run the focused test until it passes.

## Task 3: Add service persistence test-first

**Files:**

- Modify: `packages/frontend/core/src/modules/theme-editor/services/theme-editor.ts`
- Create: `packages/frontend/core/src/modules/theme-editor/services/theme-editor.spec.ts`

- [ ] Write a minimal in-memory `GlobalState` fake and failing tests for empty defaults, independent slots, replace-on-success, enable/disable, clear, malformed version fallback, and no mutation after failed normalization/storage.
- [ ] Add a separate key:

```ts
private readonly _importedCssKey = 'custom-editor-theme-css-v1';
```

- [ ] Add `importedThemeCss$`, `activeImportedCss$`, `saveImportedCss`, `setImportedCssEnabled`, and `clearImportedCss`. Keep existing `customTheme$`, `setCustomTheme`, `updateCustomTheme`, and `reset` signatures unchanged.
- [ ] Implement clear with `GlobalState.set()` of the remaining versioned state; never use `del()`, so existing Web/Electron watchers receive the update.
- [ ] Accept normalized data in the service; keep browser `File` handling and lazy parser loading in the UI layer.
- [ ] Run service and normalizer tests together and expect all passing.

## Task 4: Bundle fonts and implement the default theme

**Files:**

- Modify: `packages/frontend/component/src/theme/fonts.css`
- Create: licensed font directories/notices listed in the file map
- Create: `packages/frontend/core/src/blocksuite/editors/editor-markdown-theme.ts`
- Modify: `packages/frontend/core/src/blocksuite/editors/page-editor.ts`

- [ ] Add the smallest practical WOFF2 variable/subset files from authoritative OFL sources plus notices.
- [ ] Register distinct internal family names, for example `AFFiNE Editor Open Sans`, to avoid colliding with host/system definitions.
- [ ] Write unlayered base Lit CSS prefixed by `.page-editor-container[data-theme='light']` or dark; named layers cannot override BlockSuite's existing unlayered rules.
- [ ] Use `var(--affine-font-base)` for base scaling and preserve `var(--affine-editor-width)`.
- [ ] Target only the content selectors specified in `design.md`; do not style root widgets or non-Markdown cards.
- [ ] Compose styles after PageEditor's layout CSS:

```ts
static override styles = [pageEditorLayoutStyles, editorMarkdownTheme];
```

- [ ] Run formatting and TypeScript checks for component/core files.

## Task 5: Inject imported CSS and final variable overrides

**Files:**

- Modify: `packages/frontend/core/src/desktop/pages/root/custom-theme/index.tsx`

- [ ] Add a focused component that reads `enable_theme_editor`, `importedThemeCss$`, and `customTheme$`.
- [ ] Replace module-level `_provided` and manual imported/custom subscriptions with React `useLiveData` state.
- [ ] Replace `document.documentElement.style.cssText = ''` with tracked per-key `removeProperty()` calls before applying the next visual-variable map.
- [ ] Render one `<style data-affine-editor-theme-import>` containing only enabled sanitized light/dark outputs.
- [ ] Render unlayered editor-scoped custom-variable declarations after imports; retain the existing document-element variable application unchanged.
- [ ] When the feature flag is false, emit neither imported CSS nor import overrides; built-in PageEditor CSS remains.
- [ ] Add a DOM unit test or E2E assertion proving a malicious/global selector cannot affect an element outside `page-editor`.

## Task 6: Add the minimal import UI

**Files:**

- Create: CSS import React files listed in the file map
- Modify: `packages/frontend/core/src/desktop/pages/theme-editor/theme-editor.tsx`
- Modify: `packages/frontend/i18n/src/resources/en.json`, `zh-Hans.json`, `i18n.gen.ts`

- [ ] Add an `Imported CSS` navigation item alongside the existing V1/V2 variable browser.
- [ ] Gate the Imported CSS destination inside `/theme-editor` with `enable_theme_editor`; the route itself is not a Stable guard.
- [ ] Implement two reusable cards with file metadata, enabled switch, Import/Replace, Clear confirmation, report counts, and expandable warnings.
- [ ] Use `<input type="file" accept=".css,text/css">`; read `arrayBuffer()` to compute byte length before `TextDecoder('utf-8', { fatal: true })`.
- [ ] Dynamically import the normalizer only after a file is selected.
- [ ] Do not call the service unless normalization succeeds; surface typed errors with existing notifications.
- [ ] Clear only after confirmation; disabling retains metadata/CSS.
- [ ] Add stable test ids for the imported-css tab, both file inputs, both enable switches, both clear buttons, and both reports.
- [ ] Regenerate i18n types and run relevant component tests.

## Task 7: Integration and E2E verification

**Files:**

- Modify: `tests/affine-local/e2e/theme.spec.ts`

- [ ] Add a representative document containing headings, paragraph, link, quote, list, inline/code block, divider, and table.
- [ ] Assert built-in light and dark computed styles/fonts, live mode switching, unchanged document title, and unchanged edgeless/app-shell elements.
- [ ] Add Canary import lifecycle coverage for independent slots, replace, disable, clear, reload persistence, invalid import atomicity, and no external requests.
- [ ] Smoke-test input, selection, undo/redo, code/list/table editing after theme application.
- [ ] Verify standard width, full width, readonly/shared, and narrow viewport behavior.
- [ ] Manually import `typora_claude/claude.css` and `claude-dark.css`; record the conversion report and confirm no `claude-fonts/` request.
- [ ] Run final gates:

```bash
node .yarn/releases/yarn-4.13.0.cjs vitest --run packages/frontend/core/src/modules/theme-editor
node .yarn/releases/yarn-4.13.0.cjs lint:prettier
node .yarn/releases/yarn-4.13.0.cjs lint:eslint
node .yarn/releases/yarn-4.13.0.cjs typecheck
node .yarn/releases/yarn-4.13.0.cjs workspace @affine-test/affine-local e2e theme.spec.ts
BUILD_TYPE=canary node .yarn/releases/yarn-4.13.0.cjs affine @affine/web build
```

- [ ] Confirm emitted Web assets include the new fonts and make no third-party font requests.
- [ ] Run Trellis independent check before any commit or deployment.

## Final review and rollback

- [ ] Security review: imported CSS cannot escape selector/resource/property controls.
- [ ] Visual review: built-in references and `typora_claude` supported subset are credible.
- [ ] Regression review: title, shell, edgeless, controls, and editing remain intact.
- [ ] Licensing review: font notices and sources are complete.
- [ ] Rollout review: built-in theme is channel-independent; imports are Canary-only.
- [ ] If rollback is required, remove runtime import injection first, then UI/service/parser, then the base theme/fonts; existing `custom-theme` data is never migrated or deleted.
