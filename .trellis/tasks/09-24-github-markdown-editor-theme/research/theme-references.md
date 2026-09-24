# Theme reference research

## User-selected sources

- Light: `typora/typora-default-themes/themes/github.css`
  - https://github.com/typora/typora-default-themes/blob/master/themes/github.css
- Dark: `kinoute/typora-github-night-theme/github-night-high-contrast.css`
  - https://github.com/kinoute/typora-github-night-theme/blob/master/github-night-high-contrast.css
  - This file imports the base `github-night.css` and overrides its high-contrast palette.

## Visual tokens to adapt

### Light

- Body font: Open Sans with Helvetica/Arial/system fallbacks
- Body text: `rgb(51, 51, 51)`
- Line height: `1.6`
- Content width: `860px` default, expanding at large breakpoints
- Link: `#4183c4`
- H1/H2 divider: `#eee`
- Quote: text `#777`, left border `#dfe2e5`
- Inline/code surface: `#f3f4f4` / `#f8f8f8`
- Table border: `#dfe2e5`; alternating row surface: `#f8f8f8`

### Dark high contrast

- Body font: Nunito Sans with sans-serif/system fallbacks
- Body text: `#f0f3f6`
- Body background: `#0a0c10`
- Secondary surface: `#272b33`
- Link inherited from base GitHub Night theme: `#58a6ff`
- Divider and high-contrast border: `#7a828e`
- Inline code surface inherited from base theme: `rgba(240, 246, 252, 0.15)`
- Code font: prefer locally installed SF Mono; otherwise use AFFiNE's existing code-font stack

## Font licensing and packaging

- Open Sans and Nunito Sans are available from the Google Fonts repository under SIL Open Font License 1.1.
  - https://github.com/google/fonts/blob/main/ofl/opensans/OFL.txt
  - https://github.com/google/fonts/blob/main/ofl/nunitosans/OFL.txt
- Bundle only application-ready webfont assets required by the editor plus the corresponding license notices.
- Do not use runtime `@import` or third-party font CDN requests.
- Do not copy the theme repository's SF Mono asset. Use the local system font when present and the existing AFFiNE code-font fallback otherwise.

## Repository integration evidence

- `packages/frontend/core/src/blocksuite/editors/page-editor.ts`
  - `PageEditor` is a `ShadowlessElement` and owns `.page-editor-container`.
  - The container already receives `data-theme` from `ThemeProvider.app$`, enabling CSS-only light/dark switching.
- `packages/frontend/core/src/blocksuite/block-suite-editor/lit-adaper.tsx`
  - The document title and metadata are rendered before `LitDocEditor`, so `page-editor`-scoped styles leave them unchanged.
- `blocksuite/affine/blocks/root/src/page/page-root-block.ts`
  - The body content root uses theme CSS variables for font family, sizes, colors, width, and spacing.
- Paragraph/list/code/divider styles live in their respective BlockSuite packages but render as descendants of `page-editor`, so a more specific container-scoped stylesheet can adapt their presentation without changing edgeless mode.

## Testing evidence

- `tests/affine-local/e2e/theme.spec.ts` already switches the application from light to dark and verifies `html[data-theme]`; it is a suitable home or pattern for targeted theme assertions.
- Editor behavior tests exist under `tests/affine-local/e2e/blocksuite/`; theme work should add computed-style/scoping assertions rather than duplicate semantic editor coverage.
