# `typora_claude` compatibility assessment

Source inspected read-only:

`/Users/wuchengqi/code/qinteng/typora_claude/`

## Package contents

- `claude.css`: light theme, approximately 114 KB / 4,256 lines
- `claude-dark.css`: dark theme, approximately 115 KB / 4,318 lines
- `claude-fonts/`: seven font files referenced by both stylesheets, approximately 73 MB total
- `可变字体/`: additional WOFF2 assets not referenced by the two main CSS files

## What can be adapted

Both CSS files contain reusable document-theme information:

- color and font custom properties under `:root`
- content width, padding, background, caret, and font rules under `#write`
- heading, paragraph, strong/emphasis, highlight, underline, list, task-list, table, quote, code, link, image, math, and divider rules
- corresponding light and dark palettes

These selectors require a Typora-to-BlockSuite mapping before they can affect AFFiNE content.

## What cannot apply directly

- Typora application selectors such as sidebar, quick-open, preferences, megamenu, titlebar, source mode, and outline controls do not exist in AFFiNE and should be discarded.
- Typora editor selectors such as `.md-fences`, `.CodeMirror-*`, `.md-pair-s`, and `.md-table-*` do not match BlockSuite DOM and require supported-selector translation or omission.
- Global selectors (`*`, `html`, `body`, `:root`) cannot be injected as-is because they would escape the editor boundary; their useful declarations must be moved into the scoped editor root.

## Asset dependency

Both stylesheets reference these relative assets:

- `./claude-fonts/c66fc489e-C-BHYa_K.ttf`
- `./claude-fonts/cc27851ad-CFxw3nG7.ttf`
- `./claude-fonts/c5dbe0935-B88FVziN.ttf`
- `./claude-fonts/NotoSerifSC-VariableFont_wght.ttf`
- `./claude-fonts/NotoSansSC-VariableFont_wght.ttf`
- `./claude-fonts/SourceHanSansSC-Regular.otf`
- `./claude-fonts/SourceHanSansSC-Bold.otf`

A CSS-only import can retain the colors/layout after selector conversion but cannot reproduce the fonts. Relative font URLs would fail and must be removed or rejected.

## Conclusion

- CSS-only MVP: partial fidelity. Core supported document rules can work after conversion; fonts and unsupported Typora UI/editor rules do not.
- Full folder fidelity: requires a ZIP/folder package importer, asset storage, URL rewriting to local blob/application URLs, size limits, MIME validation, and license/user-responsibility messaging.
