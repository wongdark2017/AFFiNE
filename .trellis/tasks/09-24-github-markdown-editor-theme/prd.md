# GitHub Markdown editor theme and CSS import

## Goal

Make every AFFiNE document body use a locally bundled GitHub-style Markdown theme by default, while preserving the rest of the application, and extend the existing experimental theme editor with a minimal, safe CSS import mechanism for light and dark editor themes.

## Background

- The selected built-in light reference is `typora/typora-default-themes/themes/github.css`.
- The selected built-in dark reference is `kinoute/typora-github-night-theme/github-night-high-contrast.css`.
- AFFiNE already has an experimental visual theme editor that stores one `custom-theme` object with separate light/dark CSS-variable maps. It has no theme library, CSS import, source editor, or asset handling.
- `page-editor` owns the document body and already exposes `data-theme`; the separate document title and metadata are siblings outside it.
- The test deployment at `http://103.217.203.235:3010/` is a self-hosted Canary build, so it can exercise the existing experimental theme-editor gate after a new Canary image is deployed.
- `/Users/wuchengqi/code/qinteng/typora_claude/claude.css` and `claude-dark.css` are the concrete compatibility samples. They contain useful document styling plus unsupported Typora application selectors and relative font assets.

## Requirements

### Default editor body theme

- R1. Apply the built-in editor theme only inside the document `page-editor` body. Do not restyle the document title, document metadata, application shell, menus, dialogs, sidebars, toolbars, or edgeless/whiteboard mode.
- R2. Make the built-in theme active by default for existing and new documents in all build channels.
- R3. In light mode, adapt the supported document typography, spacing, links, headings, quotes, lists, inline code, code blocks, dividers, and tables from Typora's classic GitHub theme.
- R4. In dark mode, adapt the same supported elements from GitHub Night High Contrast.
- R5. Switch light/dark editor styles through the existing `data-theme` state without reloading or mutating document data.
- R6. Preserve existing font-size scaling and page-width/full-width behavior. The editor body font family follows the built-in/imported theme; the separate document title retains the user's existing AFFiNE font setting.

### Existing visual editor compatibility

- R7. Keep the existing visual CSS-variable editor, its light/dark columns, reset behavior, and current global-variable semantics.
- R8. Keep visual overrides and CSS imports as separate layers. Where imported/generated editor rules consume AFFiNE variables, the user's existing custom variable values must remain available as final editor-scoped overrides.

### Minimal CSS import

- R9. Add two independent import slots to the existing theme-editor window: one light CSS slot and one dark CSS slot.
- R10. Each slot supports importing/replacing one `.css` file, enabling/disabling it without deletion, and clearing it. A new import replaces the previous file only after validation succeeds.
- R11. Persist both slots locally on the current device/browser profile and share them across workspaces on that device. Do not upload them to AFFiNE Cloud or a self-hosted server.
- R12. When a slot has no enabled import, use that mode's built-in GitHub reference theme. An enabled valid import overrides the corresponding built-in editor-theme layer.
- R13. Do not provide raw CSS source editing in the first version. Users modify an imported theme by replacing its file and by using the existing visual variable editor.
- R14. Accept CSS text only. Do not import ZIP files, folders, fonts, images, or other companion assets.
- R15. Limit each imported stylesheet to 512 KiB of UTF-8 CSS and the converted output to 1 MiB. Reject unreadable files, parse failures, oversized output, and files with no supported document rules without replacing the previous valid import.
- R16. Store the sanitized/converted CSS plus file metadata and a conversion report; do not execute or retain unsupported application-level rules.

### AFFiNE and Typora compatibility

- R17. Support editor-scoped AFFiNE/BlockSuite selectors from an explicit allowlist and translate common Typora document selectors into their BlockSuite equivalents.
- R18. Translate the supported subset for root/body variables, headings, paragraphs, strong/emphasis/highlight/underline, links, lists/task lists, quotes, inline code, code blocks, dividers, tables, images, and math.
- R19. Ignore and report unsupported Typora application/editor UI selectors such as sidebars, preferences, title bars, megamenus, quick-open, source mode, CodeMirror internals, and Typora tooltips.
- R20. Scope every emitted selector beneath the editor-theme root and the matching light/dark mode. Imported CSS must not select or modify content outside `page-editor`.

### CSS safety

- R21. Reject or remove `@import`, `@font-face`, `@namespace`, external/relative/data URLs, and unsupported at-rules. No imported CSS may initiate a network or local-file request.
- R22. Sanitize selector and declaration values before persistence. Block selectors or geometry rules capable of escaping the editor boundary, including viewport-fixed overlays and unrestricted z-index positioning.
- R23. Return a user-visible import report containing applied, translated, ignored, and rejected rule counts plus actionable warnings.
- R24. Invalid CSS must leave the currently active imported stylesheet untouched.
- R24a. Clearing a slot must write a complete versioned state rather than deleting the storage key, so Web and Electron watchers receive the update.

### Deployment-provided fonts

- R25. Provide a bundled editor font catalog rather than accepting fonts from imported themes. Initial families: Open Sans, Nunito Sans, Noto Sans SC, and Noto Serif SC; reuse existing AFFiNE Inter and code-font assets where appropriate.
- R26. Use application-bundled/static font files for Web, self-hosted, and Electron builds. Do not require runtime font-CDN access.
- R27. Prefer WOFF2 variable/subset assets, include required open-font license notices, and use safe system/CJK/monospace fallbacks.
- R28. Strip imported font-face resources, retain only whitelisted family references, and remove or replace unknown/non-redistributable font names with safe fallbacks. Do not bundle Anthropic fonts without verified redistribution permission.

### Behavior and rollout

- R29. Preserve editing, selection, drag handles, block controls, keyboard shortcuts, collaboration, persistence, import/export semantics, readonly/shared views, and mobile responsive behavior.
- R30. Apply the built-in default theme in all build channels. Keep CSS import controls and imported-CSS application behind the existing `enable_theme_editor` Canary/experimental flag in the first version.

## Acceptance Criteria

- [ ] AC1 (R1-R6): Light and dark document bodies match the selected built-in references for supported blocks, switch without reload, and do not change title/metadata, app chrome, or edgeless mode.
- [ ] AC2 (R6, R29): Font-size and full-width settings continue to work; editing and readonly/shared/mobile behavior remain functional.
- [ ] AC3 (R7-R8): The existing visual variable editor and reset flow still work; its configured variables remain available to the editor after importing CSS.
- [ ] AC4 (R9-R13): Canary users can independently import, replace, enable/disable, and clear light and dark CSS; the state survives reload and is shared across local workspaces.
- [ ] AC5 (R12): Disabling or clearing one imported slot immediately restores that mode's built-in theme without affecting the other slot.
- [ ] AC6 (R15-R16, R24-R24a): Invalid, oversized, unreadable, or unsupported CSS produces a clear error/report and does not replace the previous valid stylesheet; clear operations propagate to all open local windows.
- [ ] AC7 (R17-R20): Supported AFFiNE and common Typora document selectors are converted into editor-scoped output; unsupported Typora UI rules are ignored and cannot style outside `page-editor`.
- [ ] AC8 (R21-R23): Imported CSS cannot load external/local/data resources or create fixed overlays outside the editor, and the UI reports conversions and rejections.
- [ ] AC9 (R25-R28): Bundled open fonts render without third-party requests across Web/self-hosted/Electron builds, include license notices, and use safe fallbacks for unknown theme fonts.
- [ ] AC10: Importing the inspected `typora_claude/claude.css` and `claude-dark.css` applies the supported body styling, reports ignored Typora UI/asset rules, and falls back for unavailable Anthropic fonts.
- [ ] AC11 (R30): Stable/Beta builds receive the built-in body theme but not the import UI/runtime custom CSS; Canary receives both.
- [ ] AC12: Focused unit tests cover parsing, selector translation, sanitization, font mapping, size limits, and state transitions; E2E tests cover default themes, mode switching, import lifecycle, persistence, scoping, and regression-critical editor actions.

## Out of Scope

- A multi-theme library, named themes, theme switching, duplication, export, or marketplace.
- Raw CSS source editing, draft/version history, or live source authoring.
- ZIP/folder import or per-theme font/image/resource storage.
- Cloud/account synchronization.
- Full emulation of Typora application chrome or every Typora plugin/private selector.
- Changing document storage or Markdown parsing/rendering semantics.
- Stable-channel access to CSS import in the first rollout.

## Technical Notes

- Keep imported CSS under a separate local storage key from the existing `custom-theme` value to avoid migration risk.
- Apply the built-in theme as static editor-scoped styles. Persist and inject only sanitized output for imported CSS.
- Source references and repository evidence are recorded under `research/`.
