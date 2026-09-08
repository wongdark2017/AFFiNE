import { test } from '@affine-test/kit/playwright';
import { expect } from '@playwright/test';

test('the normal mobile workspace selector still opens after initialization', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#app-tabs')).toBeVisible({ timeout: 15_000 });
  await page
    .locator('#app-tabs')
    .getByRole('tab', { name: 'home', exact: true })
    .click();
  await page.getByTestId('workspace-avatar').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('mobile workspace entry shows a missing local root and keeps the workspace menu usable', async ({
  page,
}, testInfo) => {
  const id = 'test-mobile-missing-root';
  await page.addInitScript(workspaceId => {
    localStorage.setItem(
      'affine-local-workspace',
      JSON.stringify([workspaceId])
    );
  }, id);
  await page.goto(`/workspace/${id}/all`);
  await expect(page.getByTestId('workspace-load-failure')).toHaveAttribute(
    'data-state',
    'missing-local-root',
    { timeout: 15_000 }
  );
  await expect(
    page.getByRole('heading', { name: 'Unable to open this local workspace' })
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('missing-local-root.png'),
  });
  await page.getByTestId('workspace-load-switch').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem('affine-local-workspace'))
  ).toContain(id);
});
