# Design: GitHub Markdown editor theme and CSS import

## 1. Architecture and boundaries

The feature has three logical layers with explicit precedence:

1. **Built-in editor body theme** — static, shipped in every build, scoped to `page-editor`, with light and dark reference styles.
2. **Imported CSS layer** — optional, sanitized and converted per mode, injected only when `enable_theme_editor` is enabled.
3. **Existing visual-variable overrides** — the current `custom-theme` behavior remains; editor-scoped copies of configured variables are emitted after the imported layer where needed.

Keep these rules unlayered and order their style elements as base, import, then
visual-variable overrides. BlockSuite's existing editor rules are unlayered, and
normal unlayered declarations outrank every normal declaration in a named CSS
cascade layer; using named layers here would make successfully converted Typora
rules lose to the existing editor styles. Imported `!important` flags are still
removed during normalization. The existing application-wide variable behavior
is preserved for compatibility; new built-in/imported selectors remain
editor-scoped.

The document title, properties, backlinks, application chrome, and edgeless editor are outside the `page-editor` selector root and cannot be selected by emitted CSS.

## 2. Components

### 2.1 Built-in theme module

Add a focused style module beside `packages/frontend/core/src/blocksuite/editors/page-editor.ts` and compose it after the existing PageEditor layout styles.

Responsibilities:

- register base light/dark editor variables and block selectors;
- map the selected Typora GitHub light and GitHub Night High Contrast values to BlockSuite DOM;
- preserve `--affine-font-base`, `--affine-editor-width`, responsive padding, and interaction overlays;
- target only Markdown-like document blocks and leave database/embed/card components unchanged.

Supported targets include:

- `.affine-page-root-block-container`
- `affine-paragraph` and `.h1`–`.h6` / `.quote`
- `affine-list`
- `affine-link`
- inline `code`, emphasis, underline, strike, and mark nodes
- `affine-code .affine-code-block-container`
- `affine-divider`
- `affine-table` cells/rows
- supported image and math content descendants

### 2.2 Font catalog

Extend `@affine/component`'s existing bundled font mechanism rather than creating server-side font storage.

- Add licensed WOFF2/variable/subset assets and `@font-face` entries for Open Sans, Nunito Sans, Noto Sans SC, and Noto Serif SC.
- Reuse existing Inter, Source Code Pro, IBM Plex Mono, and system monospace fallbacks.
- Add OFL license notices next to the assets or in the repository's third-party notice convention.
- Let the normal asset pipeline hash and serve files. Self-hosted Docker images include the emitted assets; Electron packages them with the renderer.
- Do not add Anthropic fonts until redistribution rights are explicitly verified.

### 2.3 CSS importer/normalizer

Create a pure module under `packages/frontend/core/src/modules/theme-editor/css-import/`.

Use PostCSS plus selector/value parsers as direct `@affine/core` dependencies. Load the importer only through the lazy `/theme-editor` route so the parser is not part of the normal editor startup path.

Pipeline:

```text
File validation
  -> UTF-8 text read and 512 KiB limit
  -> PostCSS parse
  -> at-rule/resource sanitization
  -> source-style detection (AFFiNE / Typora / generic Markdown)
  -> selector translation and allowlist filtering
  -> declaration/value sanitization and font mapping
  -> mode prefixing and unlayered serialization
  -> conversion report
  -> atomic persistence
```

The importer never inserts source CSS before this pipeline completes.

### 2.4 Theme service and persistence

Extend `ThemeEditorService` while retaining the existing `custom-theme` key and API.

Use a separate key, `custom-editor-theme-css-v1`, with this shape:

```ts
type EditorThemeMode = 'light' | 'dark';

type CssImportReport = {
  sourceKind: 'affine' | 'typora' | 'generic';
  appliedRules: number;
  translatedRules: number;
  ignoredRules: number;
  rejectedDeclarations: number;
  warnings: string[];
};

type ImportedEditorStylesheet = {
  fileName: string;
  byteLength: number;
  importedAt: number;
  enabled: boolean;
  sanitizedCss: string;
  report: CssImportReport;
};

type ImportedEditorThemeState = {
  version: 1;
  light?: ImportedEditorStylesheet;
  dark?: ImportedEditorStylesheet;
};
```

The service exposes live state and atomic methods:

- `importCss(mode, file)` — validate/convert, then replace on success;
- `setCssEnabled(mode, enabled)`;
- `clearCss(mode)`;
- `activeCss$` — returns enabled sanitized CSS for the runtime layer.

Local `GlobalState` storage matches current theme behavior, broadcasts changes across tabs/windows, and keeps themes device-global across workspaces.

Clear operations always call `set()` with the remaining `{ version: 1, ...slots }` state. Do not call `GlobalState.del()`, because current Web/Electron delete paths do not reliably notify existing watchers. Cap sanitized output at 1 MiB in addition to the 512 KiB source limit.

### 2.5 Runtime style injection

Extend the existing root-level custom-theme modifier.

- Built-in theme CSS is always present through PageEditor static styles.
- Sanitized imported CSS is rendered in a dedicated `<style data-affine-editor-theme-import>` only when the Canary feature flag is active.
- Generate a final editor-scoped variable override block from the existing `customTheme$` maps after the import layer.
- On feature disable, remove imported CSS immediately and fall back to the built-in theme.
- Never mutate document content or editor model state.
- Replace the current module-level `_provided`/manual subscription with `useLiveData` so StrictMode and multiple roots remain coherent.
- Do not use `document.documentElement.style.cssText = ''`; track the keys written by the visual editor and remove only those keys before applying the next map so font-size and unrelated inline settings survive.

### 2.6 Theme-editor UI

Preserve the existing V1/V2 variable tree. Add an `Imported CSS` destination to the theme-editor navigation.

The panel shows two independent cards:

- Light CSS
- Dark CSS

Each card contains:

- current file name, byte size, and import time;
- enabled switch;
- Import or Replace action using a `.css` file picker;
- Clear action with confirmation;
- compact conversion summary and expandable warnings.

There is no raw source viewer/editor in this version. Import errors leave the previous card/state unchanged and are shown through existing notification/error primitives.

## 3. CSS compatibility contract

### 3.1 Root mappings

- Typora `:root`, `html`, and `body` declarations are mapped to the mode-scoped editor root only.
- Typora `#write` / `.write` map to the AFFiNE page-body content root.
- AFFiNE selectors must match an explicit `page-editor`/BlockSuite content allowlist; arbitrary application selectors are rejected.

### 3.2 Semantic selector mappings

Translate common Typora/Markdown concepts to fixed BlockSuite targets:

- `h1`–`h6` -> paragraph heading classes
- `p` -> normal paragraph rich-text container
- `blockquote` -> paragraph quote class
- `ul`, `ol`, `li`, task-list selectors -> `affine-list` structures
- `pre`, `.md-fences`, `code`, `tt` -> code block or inline code targets
- `table`, `thead`, `tbody`, `tr`, `th`, `td` -> `affine-table` descendants
- `a` -> `affine-link`
- `hr` -> divider block
- supported `img`, mark/emphasis/underline/strike, and math selectors -> known descendants

Discard selectors that only describe Typora chrome, editor markers, source mode, CodeMirror, plugin windows, preferences, quick-open, outline/sidebar, and tooltips.

### 3.3 At-rules and declarations

Allowed:

- sanitized normal rules;
- scoped custom properties;
- safe `@media` and `@supports` blocks containing supported rules.

Removed/rejected:

- `@import`, `@font-face`, `@namespace`, `@page`, and unknown at-rules;
- any `url(...)`, including HTTP(S), data, file, blob, and relative paths;
- viewport-escaping `position: fixed`, unsafe sticky/offset combinations, and unrestricted z-index overlays;
- declarations that target interaction widgets or disable application safety/focus affordances globally;
- imported `!important` flags.

Unknown font families are removed from the front of font stacks until a whitelisted bundled/system fallback remains. Known Noto/Open Sans/Nunito/Inter/code families map to the bundled catalog.

## 4. Data flow

### Import

User selects light/dark CSS
-> browser reads file locally
-> importer validates and converts without applying source CSS
-> UI presents success plus warnings
-> service atomically stores sanitized CSS and metadata
-> LiveData broadcasts the new state
-> runtime style element updates
-> every open PageEditor reflects the mode-scoped import

### Mode change

Application theme changes
-> existing ThemeProvider updates `data-theme`
-> built-in/imported mode selectors switch through CSS
-> no storage or document mutation

### Disable/clear

User disables or clears one slot
-> service updates local state
-> runtime removes only that mode's import rule
-> corresponding built-in theme becomes visible immediately

## 5. Error handling

- File read, size, parse, and conversion errors are typed and user-facing.
- A failed import never overwrites the last valid stylesheet.
- CSS with zero supported rules is treated as an error, not a successful no-op.
- Non-fatal unsupported rules/resources produce warnings and counts.
- Storage quota failures keep runtime state unchanged and prompt the user to clear/replace the local import.
- Runtime injection receives only persisted sanitized CSS; malformed stored versions are ignored and resettable.

## 6. Compatibility and rollout

- No migration is needed for existing `custom-theme` data.
- Stable/Beta/Internal builds ship the built-in theme but ignore imported CSS and do not expose import controls.
- Canary enables the existing theme editor and the import layer.
- `typora_claude` light/dark files are manual compatibility fixtures: core body rules should translate; its 73 MB relative font folder and Typora chrome rules are intentionally ignored.
- Full ZIP/assets, theme libraries, source editing, cloud sync, and Stable import access remain future work.

## 7. Rollback

- Removing the import panel, importer module, service state key, and runtime style element returns CSS import to the prior behavior without user-data migration.
- Removing the built-in style composition and new font assets restores the original document presentation.
- Unknown persisted `custom-editor-theme-css-v1` data is inert when runtime support is absent.

## 8. Verification design

### Unit

- input validation and 512 KiB boundary;
- malformed CSS and atomic replacement behavior;
- converted-output 1 MiB boundary;
- Typora/AFFiNE/generic detection;
- selector mappings for every supported semantic target;
- rejection of global/UI selectors, URLs, unsafe at-rules/properties, and `!important`;
- font-family whitelist/fallback mapping;
- conversion report counts and warnings;
- service enable/disable/clear transitions and malformed persisted state.
- cross-window clear propagation through full-state `set()` semantics.

### E2E

- default light/dark computed styles and font loading;
- mode switch without reload;
- title/app shell/edgeless scoping;
- independent light/dark import, replace, disable, clear, and reload persistence;
- failed import keeps prior valid CSS;
- representative editing, selection, code, list, table, undo/redo behavior;
- standard width, full width, readonly/shared, and narrow viewport smoke coverage;
- no external font/resource request from imported CSS.

### Manual

- import the inspected `typora_claude` light/dark CSS files;
- compare representative content blocks and conversion warnings;
- deploy a Canary image to the existing test environment and verify same-origin font assets plus the import UI.
