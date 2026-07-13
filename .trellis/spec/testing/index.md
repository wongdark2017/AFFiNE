# Testing

> How tests are actually written and run in this monorepo. Two systems coexist:
> **Vitest** for unit/component tests (co-located with source) and **Playwright** for E2E
> (under `tests/`). Backend server tests are covered in [backend/testing.md](../backend/testing.md).

---

## Unit tests (Vitest)

- Root config: `vitest.config.ts` — includes `packages/{common,frontend}/**/*.spec.{ts,tsx}`
  and runs sub-projects for `packages/frontend/apps/electron` and every blocksuite package with
  its own `vitest.config.ts`. Default timeout 5s.
- Naming: **`*.spec.ts` / `*.spec.tsx`**, co-located with source, usually in `__tests__/`
  folders (e.g. `packages/common/env/src/__tests__/is-valid-ip-address.spec.ts`,
  `packages/frontend/core/src/utils/__tests__/extract-emoji-icon.spec.ts`).
- Setup files under `scripts/setup/` (polyfills, Lit custom-elements stubs, `vi.mock` for
  lottie-web, `BUILD_CONFIG` global) are applied automatically — don't re-stub these per test.
- Style: plain `describe`/`test`/`expect` from `vitest`:

  ```ts
  import { expect, test } from 'vitest';
  import { extractEmojiIcon } from '../extract-emoji-icon';

  test('extract-emoji-icon', () => {
    expect(extractEmojiIcon('❤️123')).toEqual({ emoji: '❤️', rest: '123' });
  });
  ```

- Run with `yarn test` (all), `yarn test:ui`, `yarn test:coverage` from the repo root, or
  `yarn vitest <path>` for a single file.

## Component tests (Vitest + React Testing Library)

They exist (~19 files) and run under the same root config. The default environment is node;
opt into a DOM **per file** with a docblock pragma:

```tsx
/**
 * @vitest-environment happy-dom
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  afterEach(() => cleanup());
  test('renders', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });
});
```

Real example: `packages/frontend/admin/src/components/ui/button.spec.tsx`. There is no vitest
browser mode in this repo — use `happy-dom` + RTL.

## E2E tests (Playwright, `tests/`)

- Suites: `tests/affine-local` (no-auth web), `tests/affine-cloud` (auth/collab),
  `tests/affine-cloud-copilot` (AI), `tests/affine-desktop[-cloud]` (Electron),
  `tests/affine-mobile` (device profiles), `tests/blocksuite` (editor engine, own helpers).
- **Always import `test` from `@affine-test/kit/playwright`** (`tests/kit/src/playwright.ts`)
  and `expect` from `@playwright/test`. The kit fixture adds a `workspace` fixture, a
  `playwright-test` body class (fast animations), onboarding skip, and coverage wiring.
- Page-object utils live in `tests/kit/src/utils/` — `load-page.ts` (`openHomePage`),
  `page-logic.ts` (`clickNewPageButton`, `waitForEditorLoad`, `getBlockSuiteEditorTitle`),
  `cloud.ts` (`createRandomUser`, `loginUser`, `enableCloudWorkspace`, MailHog helpers),
  `sidebar.ts`, `setting.ts`, etc. Extend these instead of inlining selectors.
- Selection: prefer `page.getByTestId('...')` / `data-testid` attributes; editor internals use
  tag/class selectors (`doc-title .inline-editor`, `v-line`).

  ```ts
  import { test } from '@affine-test/kit/playwright';
  import { openHomePage } from '@affine-test/kit/utils/load-page';
  import { clickNewPageButton, waitForEditorLoad } from '@affine-test/kit/utils/page-logic';
  import { expect } from '@playwright/test';

  test('creates a page', async ({ page, workspace }) => {
    await openHomePage(page);
    await waitForEditorLoad(page);
    await clickNewPageButton(page);
    expect((await workspace.current()).meta.flavour).toContain('local');
  });
  ```

  Real examples: `tests/affine-local/e2e/local-first-new-page.spec.ts`,
  `tests/affine-cloud/e2e/login.spec.ts`.

- Cloud suites provision users directly (`@faker-js/faker`, `@node-rs/argon2`, Prisma) and
  verify emails via MailHog at `http://localhost:8025`.
- Configs auto-start the app via `webServer` (`yarn run -T affine dev -p @affine/web`,
  `reuseExistingServer: !CI`). Run with `yarn workspace @affine-test/affine-local e2e` (or the
  matching suite package). Static fixture assets live in `tests/fixtures/`.

## Anti-patterns

- New naming schemes (`*.test.ts`, `*.unit.spec.ts`) — the glob is `*.spec.{ts,tsx}`.
- Importing `test` from `@playwright/test` in AFFiNE E2E suites — you lose the kit fixtures.
- Inline CSS selectors in e2e specs when a `data-testid` or a kit util exists; add a
  `data-testid` to new UI you intend to test.
- Adding a per-package vitest config for `packages/frontend/*` — the root glob already picks
  up co-located specs (see `packages/frontend/admin`, which has no config or test script).
