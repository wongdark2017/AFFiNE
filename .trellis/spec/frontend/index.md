# Frontend Specs (`packages/frontend`)

| Spec                   | Covers                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [forms.md](./forms.md) | Form state (`useState` + `useAsyncCallback`), `@affine/component` primitives, validation, GraphQL mutations via stores/services, vanilla-extract styling |

Quick orientation: `packages/frontend/component` (shared UI primitives) ·
`packages/frontend/core` (app logic; DI services/stores under `src/modules/*`) ·
`packages/frontend/apps/*` (app shells: web, electron, mobile) ·
`packages/frontend/admin` (admin panel, Tailwind-based, separate conventions; has its own
lightweight i18n layer at `src/i18n/` — `t('English source')` dictionary lookup with English
fallback, plus `translateConfigDesc()` overlay for generated config descriptors — do NOT hand-edit
the generated `src/config.json`, and wrap any new user-visible admin copy in `t()` with a matching
`zh.ts` entry).
