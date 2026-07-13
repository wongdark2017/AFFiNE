# Bootstrap Task: Fill Project Development Guidelines

**You (the AI) are running this task. The developer does not read this file.**

The developer just ran `trellis init` on this project for the first time.
`.trellis/` now exists with empty spec scaffolding, and this bootstrap task
exists under `.trellis/tasks/`. When they want to work on it, they should start
this task from a session that provides Trellis session identity.

**Your job**: help them populate `.trellis/spec/` with the team's real
coding conventions. Every future AI session — this project's
`trellis-implement` and `trellis-check` sub-agents — auto-loads spec files
listed in per-task jsonl manifests. Empty spec = sub-agents write generic
code. Real spec = sub-agents match the team's actual patterns.

Don't dump instructions. Open with a short greeting, figure out if the repo
has any existing convention docs (CLAUDE.md, .cursorrules, etc.), and drive
the rest conversationally.

---

## Status (update the checkboxes as you complete each item)

- [ ] Fill guidelines for @affine/server-native
- [ ] Fill guidelines for @affine/server
- [ ] Fill guidelines for @affine/debug
- [ ] Fill guidelines for @affine/env
- [ ] Fill guidelines for @affine/error
- [ ] Fill guidelines for @affine/graphql
- [ ] Fill guidelines for @toeverything/infra
- [ ] Fill guidelines for affine_common
- [ ] Fill guidelines for @affine/nbstore
- [ ] Fill guidelines for @affine/reader
- [ ] Fill guidelines for @affine/realtime
- [ ] Fill guidelines for @affine/s3-compat
- [ ] Fill guidelines for theme
- [ ] Fill guidelines for @affine/admin
- [ ] Fill guidelines for apps
- [ ] Fill guidelines for @affine/component
- [ ] Fill guidelines for @affine/core
- [ ] Fill guidelines for @affine/electron-api
- [ ] Fill guidelines for @affine/i18n
- [ ] Fill guidelines for affine_mobile_native
- [ ] Fill guidelines for @affine/native
- [ ] Fill guidelines for @affine/routes
- [ ] Fill guidelines for @affine/templates
- [ ] Fill guidelines for @affine/track
- [ ] Fill guidelines for @affine/android
- [ ] Fill guidelines for @affine/electron
- [ ] Fill guidelines for @affine/electron-renderer
- [ ] Fill guidelines for @affine/ios
- [ ] Fill guidelines for @affine/mobile
- [ ] Fill guidelines for @affine/mobile-shared
- [ ] Fill guidelines for @affine/web
- [ ] Fill guidelines for @types
- [ ] Fill guidelines for @affine/changelog
- [ ] Fill guidelines for @affine-tools/cli
- [ ] Fill guidelines for @affine/commitlint-config
- [ ] Fill guidelines for @affine/copilot-result
- [ ] Fill guidelines for @affine/doc-diff
- [ ] Fill guidelines for @affine/playstore-auto-bump
- [ ] Fill guidelines for @affine/revert-update
- [ ] Fill guidelines for @affine-tools/utils
- [ ] Fill guidelines for @affine/docs
- [ ] Fill guidelines for @types/build-config
- [ ] Fill guidelines for @types/affine\_\_env
- [ ] Fill guidelines for @affine-test/affine-cloud
- [ ] Fill guidelines for @affine-test/affine-cloud-copilot
- [ ] Fill guidelines for @affine-test/affine-desktop
- [ ] Fill guidelines for @affine-test/affine-desktop-cloud
- [ ] Fill guidelines for @affine-test/affine-local
- [ ] Fill guidelines for @affine-test/affine-mobile
- [ ] Fill guidelines for @affine-test/blocksuite
- [ ] Fill guidelines for fixtures
- [ ] Fill guidelines for @affine-test/kit
- [ ] Fill guidelines for affine_nbstore
- [ ] Fill guidelines for affine_schema
- [ ] Fill guidelines for affine_sqlite_v1
- [ ] Add code examples

---

## Spec files to populate

### Package: @affine/server-native (`spec/server-native/`)

- Backend guidelines: `.trellis/spec/server-native/backend/`

- Frontend guidelines: `.trellis/spec/server-native/frontend/`

### Package: @affine/server (`spec/server/`)

- Backend guidelines: `.trellis/spec/server/backend/`

- Frontend guidelines: `.trellis/spec/server/frontend/`

### Package: @affine/debug (`spec/debug/`)

- Backend guidelines: `.trellis/spec/debug/backend/`

- Frontend guidelines: `.trellis/spec/debug/frontend/`

### Package: @affine/env (`spec/env/`)

- Frontend guidelines: `.trellis/spec/env/frontend/`

### Package: @affine/error (`spec/error/`)

- Backend guidelines: `.trellis/spec/error/backend/`

- Frontend guidelines: `.trellis/spec/error/frontend/`

### Package: @affine/graphql (`spec/graphql/`)

- Backend guidelines: `.trellis/spec/graphql/backend/`

- Frontend guidelines: `.trellis/spec/graphql/frontend/`

### Package: @toeverything/infra (`spec/infra/`)

- Backend guidelines: `.trellis/spec/infra/backend/`

- Frontend guidelines: `.trellis/spec/infra/frontend/`

### Package: affine_common (`spec/affine_common/`)

- Backend guidelines: `.trellis/spec/affine_common/backend/`

### Package: @affine/nbstore (`spec/nbstore/`)

- Backend guidelines: `.trellis/spec/nbstore/backend/`

- Frontend guidelines: `.trellis/spec/nbstore/frontend/`

### Package: @affine/reader (`spec/reader/`)

- Backend guidelines: `.trellis/spec/reader/backend/`

- Frontend guidelines: `.trellis/spec/reader/frontend/`

### Package: @affine/realtime (`spec/realtime/`)

- Backend guidelines: `.trellis/spec/realtime/backend/`

- Frontend guidelines: `.trellis/spec/realtime/frontend/`

### Package: @affine/s3-compat (`spec/s3-compat/`)

- Backend guidelines: `.trellis/spec/s3-compat/backend/`

- Frontend guidelines: `.trellis/spec/s3-compat/frontend/`

### Package: theme (`spec/theme/`)

- Backend guidelines: `.trellis/spec/theme/backend/`

- Frontend guidelines: `.trellis/spec/theme/frontend/`

### Package: @affine/admin (`spec/admin/`)

- Frontend guidelines: `.trellis/spec/admin/frontend/`

### Package: apps (`spec/apps/`)

- Backend guidelines: `.trellis/spec/apps/backend/`

- Frontend guidelines: `.trellis/spec/apps/frontend/`

### Package: @affine/component (`spec/component/`)

- Backend guidelines: `.trellis/spec/component/backend/`

- Frontend guidelines: `.trellis/spec/component/frontend/`

### Package: @affine/core (`spec/core/`)

- Frontend guidelines: `.trellis/spec/core/frontend/`

### Package: @affine/electron-api (`spec/electron-api/`)

- Backend guidelines: `.trellis/spec/electron-api/backend/`

- Frontend guidelines: `.trellis/spec/electron-api/frontend/`

### Package: @affine/i18n (`spec/i18n/`)

- Backend guidelines: `.trellis/spec/i18n/backend/`

- Frontend guidelines: `.trellis/spec/i18n/frontend/`

### Package: affine_mobile_native (`spec/affine_mobile_native/`)

- Backend guidelines: `.trellis/spec/affine_mobile_native/backend/`

### Package: @affine/native (`spec/native/`)

- Backend guidelines: `.trellis/spec/native/backend/`

- Frontend guidelines: `.trellis/spec/native/frontend/`

### Package: @affine/routes (`spec/routes/`)

- Backend guidelines: `.trellis/spec/routes/backend/`

- Frontend guidelines: `.trellis/spec/routes/frontend/`

### Package: @affine/templates (`spec/templates/`)

- Frontend guidelines: `.trellis/spec/templates/frontend/`

### Package: @affine/track (`spec/track/`)

- Backend guidelines: `.trellis/spec/track/backend/`

- Frontend guidelines: `.trellis/spec/track/frontend/`

### Package: @affine/android (`spec/android/`)

- Frontend guidelines: `.trellis/spec/android/frontend/`

### Package: @affine/electron (`spec/electron/`)

- Frontend guidelines: `.trellis/spec/electron/frontend/`

### Package: @affine/electron-renderer (`spec/electron-renderer/`)

- Frontend guidelines: `.trellis/spec/electron-renderer/frontend/`

### Package: @affine/ios (`spec/ios/`)

- Frontend guidelines: `.trellis/spec/ios/frontend/`

### Package: @affine/mobile (`spec/mobile/`)

- Frontend guidelines: `.trellis/spec/mobile/frontend/`

### Package: @affine/mobile-shared (`spec/mobile-shared/`)

- Backend guidelines: `.trellis/spec/mobile-shared/backend/`

- Frontend guidelines: `.trellis/spec/mobile-shared/frontend/`

### Package: @affine/web (`spec/web/`)

- Frontend guidelines: `.trellis/spec/web/frontend/`

### Package: @types (`spec/@types/`)

- Backend guidelines: `.trellis/spec/@types/backend/`

- Frontend guidelines: `.trellis/spec/@types/frontend/`

### Package: @affine/changelog (`spec/changelog/`)

- Frontend guidelines: `.trellis/spec/changelog/frontend/`

### Package: @affine-tools/cli (`spec/cli/`)

- Frontend guidelines: `.trellis/spec/cli/frontend/`

### Package: @affine/commitlint-config (`spec/commitlint-config/`)

- Frontend guidelines: `.trellis/spec/commitlint-config/frontend/`

### Package: @affine/copilot-result (`spec/copilot-result/`)

- Frontend guidelines: `.trellis/spec/copilot-result/frontend/`

### Package: @affine/doc-diff (`spec/doc-diff/`)

- Backend guidelines: `.trellis/spec/doc-diff/backend/`

- Frontend guidelines: `.trellis/spec/doc-diff/frontend/`

### Package: @affine/playstore-auto-bump (`spec/playstore-auto-bump/`)

- Frontend guidelines: `.trellis/spec/playstore-auto-bump/frontend/`

### Package: @affine/revert-update (`spec/revert-update/`)

- Frontend guidelines: `.trellis/spec/revert-update/frontend/`

### Package: @affine-tools/utils (`spec/utils/`)

- Backend guidelines: `.trellis/spec/utils/backend/`

- Frontend guidelines: `.trellis/spec/utils/frontend/`

### Package: @affine/docs (`spec/docs/`)

- Frontend guidelines: `.trellis/spec/docs/frontend/`

### Package: @types/build-config (`spec/build-config/`)

- Frontend guidelines: `.trellis/spec/build-config/frontend/`

### Package: @types/affine**env (`spec/affine**env/`)

- Frontend guidelines: `.trellis/spec/affine__env/frontend/`

### Package: @affine-test/affine-cloud (`spec/affine-cloud/`)

- Frontend guidelines: `.trellis/spec/affine-cloud/frontend/`

### Package: @affine-test/affine-cloud-copilot (`spec/affine-cloud-copilot/`)

- Frontend guidelines: `.trellis/spec/affine-cloud-copilot/frontend/`

### Package: @affine-test/affine-desktop (`spec/affine-desktop/`)

- Frontend guidelines: `.trellis/spec/affine-desktop/frontend/`

### Package: @affine-test/affine-desktop-cloud (`spec/affine-desktop-cloud/`)

- Frontend guidelines: `.trellis/spec/affine-desktop-cloud/frontend/`

### Package: @affine-test/affine-local (`spec/affine-local/`)

- Frontend guidelines: `.trellis/spec/affine-local/frontend/`

### Package: @affine-test/affine-mobile (`spec/affine-mobile/`)

- Frontend guidelines: `.trellis/spec/affine-mobile/frontend/`

### Package: @affine-test/blocksuite (`spec/blocksuite/`)

- Frontend guidelines: `.trellis/spec/blocksuite/frontend/`

### Package: fixtures (`spec/fixtures/`)

- Backend guidelines: `.trellis/spec/fixtures/backend/`

- Frontend guidelines: `.trellis/spec/fixtures/frontend/`

### Package: @affine-test/kit (`spec/kit/`)

- Backend guidelines: `.trellis/spec/kit/backend/`

- Frontend guidelines: `.trellis/spec/kit/frontend/`

### Package: affine_nbstore (`spec/affine_nbstore/`)

- Backend guidelines: `.trellis/spec/affine_nbstore/backend/`

### Package: affine_schema (`spec/affine_schema/`)

- Backend guidelines: `.trellis/spec/affine_schema/backend/`

### Package: affine_sqlite_v1 (`spec/affine_sqlite_v1/`)

- Backend guidelines: `.trellis/spec/affine_sqlite_v1/backend/`

### Thinking guides (already populated)

`.trellis/spec/guides/` contains general thinking guides pre-filled with
best practices. Customize only if something clearly doesn't fit this project.

---

## How to fill the spec

### Step 1: Import from existing convention files first (preferred)

Search the repo for existing convention docs. If any exist, read them and
extract the relevant rules into the matching `.trellis/spec/` files —
usually much faster than documenting from scratch.

| File / Directory                                                            | Tool                                         |
| --------------------------------------------------------------------------- | -------------------------------------------- |
| `CLAUDE.md` / `CLAUDE.local.md`                                             | Claude Code                                  |
| `AGENTS.md`                                                                 | Codex / Claude Code / agent-compatible tools |
| `.cursorrules`                                                              | Cursor                                       |
| `.cursor/rules/*.mdc`                                                       | Cursor (rules directory)                     |
| `.windsurfrules`                                                            | Windsurf                                     |
| `.clinerules`                                                               | Cline                                        |
| `.roomodes`                                                                 | Roo Code                                     |
| `.github/copilot-instructions.md`                                           | GitHub Copilot                               |
| `.vscode/settings.json` → `github.copilot.chat.codeGeneration.instructions` | VS Code Copilot                              |
| `CONVENTIONS.md` / `.aider.conf.yml`                                        | aider                                        |
| `CONTRIBUTING.md`                                                           | General project conventions                  |
| `.editorconfig`                                                             | Editor formatting rules                      |

### Step 2: Analyze the codebase for anything not covered by existing docs

Scan real code to discover patterns. Before writing each spec file:

- Find 2-3 real examples of each pattern in the codebase.
- Reference real file paths (not hypothetical ones).
- Document anti-patterns the team clearly avoids.

### Step 3: Document reality, not ideals

**Critical**: write what the code _actually does_, not what it should do.
Sub-agents match the spec, so aspirational patterns that don't exist in the
codebase will cause sub-agents to write code that looks out of place.

If the team has known tech debt, document the current state — improvement
is a separate conversation, not a bootstrap concern.

---

## Quick explainer of the runtime (share when they ask "why do we need spec at all")

- Every AI coding task spawns two sub-agents: `trellis-implement` (writes
  code) and `trellis-check` (verifies quality).
- Each task has `implement.jsonl` / `check.jsonl` manifests listing which
  spec files to load.
- The platform hook auto-injects those spec files + the task's `prd.md`
  into every sub-agent prompt, so the sub-agent codes/reviews per team
  conventions without anyone pasting them manually.
- Source of truth: `.trellis/spec/`. That's why filling it well now pays
  off forever.

---

## Completion

When the developer confirms the checklist items above are done with real
examples (not placeholders), guide them to run:

```bash
python3 ./.trellis/scripts/task.py finish
python3 ./.trellis/scripts/task.py archive 00-bootstrap-guidelines
```

After archive, every new developer who joins this project will get a
`00-join-<slug>` onboarding task instead of this bootstrap task.

---

## Suggested opening line

"Welcome to Trellis! Your init just set me up to help you fill the project
spec — a one-time setup so every future AI session follows the team's
conventions instead of writing generic code. Before we start, do you have
any existing convention docs (CLAUDE.md, .cursorrules, CONTRIBUTING.md,
etc.) I can pull from, or should I scan the codebase from scratch?"
