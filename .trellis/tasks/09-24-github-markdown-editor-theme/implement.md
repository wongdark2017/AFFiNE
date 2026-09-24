# Implementation plan: GitHub Markdown editor theme and CSS import

## Preconditions

- Read `prd.md`, `design.md`, and both `research/*.md` files.
- Run `trellis-before-dev` and load the `@affine/core` frontend specs plus shared guides.
- Preserve unrelated working-tree changes.
- Follow test-first implementation for parser/service behavior.

## Phase 1: CSS import contract and tests

- [ ] Add direct runtime dependencies required for lazy-loaded CSS parsing (`postcss`, selector parser, value parser) to `@affine/core`.
- [ ] Define imported-theme state, report, error, mode, and version types without changing the existing `CustomTheme` contract.
- [ ] Add representative test fixtures for AFFiNE selectors, Typora selectors, unsafe resources, unsafe geometry, invalid CSS, and a compact `typora_claude`-like sample.
- [ ] Write failing unit tests for file/type/size validation, selector translation, declaration sanitization, font mapping, at-rule filtering, scoping, reports, and zero-supported-rule rejection.
- [ ] Implement the parser/normalizer as a pure module and make the tests pass.
- [ ] Confirm output is deterministic so persisted CSS and reports are stable across reloads.

Rollback checkpoint: parser code and dependency changes are isolated and not wired into runtime.

## Phase 2: Bundled fonts and default body theme

- [ ] Add licensed Open Sans, Nunito Sans, Noto Sans SC, and Noto Serif SC WOFF2/variable/subset assets following the component font layout.
- [ ] Add OFL notices and extend the existing font-face stylesheet.
- [ ] Add the editor-body base theme module with explicit cascade layer and light/dark selectors.
- [ ] Compose the base theme into `PageEditor` without touching `DocTitle` or `EdgelessEditor`.
- [ ] Map paragraph headings, body text, links, lists, quotes, inline/code blocks, dividers, and normal table blocks.
- [ ] Preserve editor width, user font-size scaling, responsive side padding, and interaction widgets.
- [ ] Add targeted style/unit assertions where practical.

Rollback checkpoint: removing one PageEditor style composition restores the previous UI; fonts are otherwise inert.

## Phase 3: Local persistence and runtime state

- [ ] Add failing service tests for independent light/dark slots, atomic replace, enable/disable, clear, default empty state, and malformed persisted versions.
- [ ] Extend `ThemeEditorService` with the separate `custom-editor-theme-css-v1` state and methods.
- [ ] Store only sanitized CSS, metadata, and report; never persist unapplied source CSS.
- [ ] Add a derived active-CSS stream gated by `enable_theme_editor`.
- [ ] Add runtime style injection for sanitized CSS and final editor-scoped variable overrides.
- [ ] Verify cross-window/tab propagation through existing GlobalState watch behavior.

Rollback checkpoint: deleting the new storage key consumer leaves the old `custom-theme` path unchanged.

## Phase 4: Theme-editor UI

- [ ] Add localized strings for imported CSS, Light CSS, Dark CSS, Import, Replace, Enable, Disable, Clear, conversion summary, warnings, and error states.
- [ ] Add an `Imported CSS` navigation destination while preserving the V1/V2 variable tree.
- [ ] Build reusable light/dark import cards using existing AFFiNE components.
- [ ] Restrict file selection to `.css`, read locally, invoke the lazy importer, and commit only successful conversions.
- [ ] Display filename, size, timestamp, enabled state, report counts, and expandable warnings.
- [ ] Add confirmation for Clear and notifications for failure/success.
- [ ] Confirm the Web popup and Electron theme-editor window share state with the main app.

Rollback checkpoint: the existing variable editor remains accessible even if the import panel is removed.

## Phase 5: Integration and verification

- [ ] Extend focused E2E coverage for default light/dark styles, switching, scoping, full-width behavior, and local font requests.
- [ ] Add Canary-only import lifecycle E2E: light/dark independence, replace, disable, clear, reload persistence, and invalid-import atomicity.
- [ ] Exercise representative editing operations after theme application.
- [ ] Manually import `typora_claude/claude.css` and `claude-dark.css`; record applied/ignored/rejected counts and verify no requests for `claude-fonts/`.
- [ ] Verify Stable/Beta behavior through a build-config test or targeted build: built-in theme present, import UI/runtime absent.
- [ ] Build a Canary Web artifact and confirm the font files are emitted.
- [ ] Deploy a Canary test image only after local checks pass; verify at `http://103.217.203.235:3010/`.

## Validation commands

Use the narrowest command that covers each change, then run the broader gates before completion:

```bash
yarn vitest --run packages/frontend/core/src/modules/theme-editor
yarn lint:prettier
yarn lint:eslint
yarn typecheck
yarn workspace @affine-test/affine-local e2e theme.spec.ts
BUILD_TYPE=canary yarn affine @affine/web build
```

If the full repository lint/typecheck is too expensive during iteration, run it once at the final gate and use file/package-scoped checks between edits.

## Review gates

- [ ] Security review: no selector or resource escape from imported CSS.
- [ ] Visual review: reference light/dark fidelity and `typora_claude` compatibility.
- [ ] Regression review: title/app shell/edgeless and editor interactions unchanged.
- [ ] Licensing review: all newly bundled fonts include appropriate notices.
- [ ] Rollout review: imported CSS remains Canary-only while base theme is channel-independent.

## Final rollback plan

- Disable imported CSS by removing/gating the runtime injector; persisted data remains inert.
- Remove the import panel and service methods without touching existing `custom-theme` data.
- Remove the PageEditor base-theme composition to restore the old body UI.
- Remove only newly added font assets and notices after the theme no longer references them.
