import { test } from '@affine-test/kit/playwright';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import { waitForEditorLoad } from '@affine-test/kit/utils/page-logic';
import { createLocalWorkspace } from '@affine-test/kit/utils/workspace';
import { expect } from '@playwright/test';

const missingWorkspaceId = 'test-missing-local-root';

test('a stale local workspace registration has an actionable error instead of endless loading', async ({
  page,
}, testInfo) => {
  await page.addInitScript(id => {
    localStorage.setItem('affine-local-workspace', JSON.stringify([id]));
  }, missingWorkspaceId);
  await page.goto(`/workspace/${missingWorkspaceId}/all`);
  const error = page.getByTestId('workspace-load-failure');
  await expect(error).toHaveAttribute('data-state', 'missing-local-root', {
    timeout: 15_000,
  });
  await expect(
    page.getByRole('heading', { name: 'Unable to open this local workspace' })
  ).toBeVisible();
  await expect(error.getByText('Syncing...', { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem('affine-local-workspace'))
  ).toContain(missingWorkspaceId);
  const screenshotPath = testInfo.outputPath('missing-root-error-page.png');
  await page.screenshot({ path: screenshotPath });
  await testInfo.attach('missing-root-error-page', {
    path: screenshotPath,
    contentType: 'image/png',
  });
  await Promise.all([
    page.waitForEvent('load'),
    page.getByTestId('workspace-load-reload').click(),
  ]);
  await expect(error).toHaveAttribute('data-state', 'missing-local-root');
  await page.getByTestId('workspace-load-switch').click();
  await expect(page.getByTestId('new-workspace')).toBeVisible();
});

test('the error page can switch to a healthy workspace without looping through the bad last-workspace entry', async ({
  page,
  workspace,
}) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await createLocalWorkspace({ name: 'Healthy workspace' }, page);
  const healthy = await workspace.current();
  await page.evaluate(id => {
    const ids: string[] = JSON.parse(
      localStorage.getItem('affine-local-workspace') ?? '[]'
    );
    localStorage.setItem(
      'affine-local-workspace',
      JSON.stringify([...ids, id])
    );
  }, missingWorkspaceId);
  await page.goto(`/workspace/${missingWorkspaceId}/all`);
  await expect(page.getByTestId('workspace-load-failure')).toBeVisible({
    timeout: 15_000,
  });
  await page.getByTestId('workspace-load-switch').click();
  await page
    .getByTestId('workspace-card')
    .filter({ hasText: 'Healthy workspace' })
    .click();
  await expect(page).toHaveURL(new RegExp(`/workspace/${healthy.meta.id}/all`));
  await expect(page.getByTestId('workspace-load-failure')).toHaveCount(0);
  await expect(page.getByTestId('workspace-name').first()).toHaveText(
    'Healthy workspace'
  );
});

test('an unresponsive data worker shows a timeout, not a claim that local data is missing', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.addInitScript(id => {
    localStorage.setItem('affine-local-workspace', JSON.stringify([id]));
  }, missingWorkspaceId);
  await page.route(/nbstore.*\.worker\.js/, route =>
    route.fulfill({
      contentType: 'text/javascript',
      body: 'self.onconnect = () => {};',
    })
  );
  await page.goto(`/workspace/${missingWorkspaceId}/all`);
  await expect(page.getByTestId('workspace-load-failure')).toHaveAttribute(
    'data-state',
    'stalled',
    { timeout: 45_000 }
  );
  await expect(
    page.getByRole('heading', { name: 'Workspace is taking longer to load' })
  ).toBeVisible();
});
