import { importFile } from '@affine-test/kit/utils/attachment';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  waitForAllPagesLoad,
  waitForEditorLoad,
  waitForEmptyEditor,
} from '@affine-test/kit/utils/page-logic';
import { clickSideBarAllPageButton } from '@affine-test/kit/utils/sidebar';
import test, { expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page);
  await waitForEmptyEditor(page);
});

test('Open import dialog by click root sidebar import button', async ({
  page,
}) => {
  await page.getByTestId('slider-bar-import-button').click();

  const importDialog = page.getByTestId('import-dialog');
  await expect(importDialog).toBeVisible();

  await page.getByTestId('modal-close-button').click();
  await expect(importDialog).not.toBeVisible();
});

test('Open import dialog by click header menu import button', async ({
  page,
}) => {
  await page.getByTestId('header-dropDownButton').click();
  await page.getByTestId('editor-option-menu-import').click();

  const importDialog = page.getByTestId('import-dialog');
  await expect(importDialog).toBeVisible();

  await page.getByTestId('modal-close-button').click();
  await expect(importDialog).not.toBeVisible();
});

test('Import multiple markdown zip files at once', async ({ page }) => {
  await page.getByTestId('slider-bar-import-button').click();
  const importDialog = page.getByTestId('import-dialog');
  await expect(importDialog).toBeVisible();

  await importFile(
    page,
    ['markdown-zip-a.zip', 'markdown-zip-b.zip'],
    async page => {
      await page
        .getByTestId('editor-option-menu-import-markdown-with-media')
        .click();
    }
  );

  const completeButton = page.getByRole('button', { name: 'Complete' });
  await expect(completeButton).toBeVisible({ timeout: 15000 });
  await completeButton.click();
  await expect(importDialog).not.toBeVisible();

  // Docs from both zips should land in the workspace. Titles are derived
  // from the markdown file names.
  await clickSideBarAllPageButton(page);
  await waitForAllPagesLoad(page);
  const docList = page.locator('[data-testid="doc-list-item"]');
  await expect(docList.filter({ hasText: 'alpha-one' })).toBeVisible();
  await expect(docList.filter({ hasText: 'alpha-two' })).toBeVisible();
  await expect(docList.filter({ hasText: 'beta-one' })).toBeVisible();
});

test('Importing multiple zips continues when one archive is broken', async ({
  page,
}) => {
  await page.getByTestId('slider-bar-import-button').click();
  const importDialog = page.getByTestId('import-dialog');
  await expect(importDialog).toBeVisible();

  await importFile(
    page,
    ['broken-archive.zip', 'markdown-zip-b.zip'],
    async page => {
      await page
        .getByTestId('editor-option-menu-import-markdown-with-media')
        .click();
    }
  );

  // The import succeeds with a warning naming the broken archive.
  const completeButton = page.getByRole('button', { name: 'Complete' });
  await expect(completeButton).toBeVisible({ timeout: 15000 });
  await expect(importDialog.getByText(/broken-archive\.zip/)).toBeVisible();
  await completeButton.click();
  await expect(importDialog).not.toBeVisible();

  // The healthy zip should still be imported.
  await clickSideBarAllPageButton(page);
  await waitForAllPagesLoad(page);
  const docList = page.locator('[data-testid="doc-list-item"]');
  await expect(docList.filter({ hasText: 'beta-one' })).toBeVisible();
});

test('Open import dialog by @ menu import button', async ({ page }) => {
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  await page.keyboard.type('@', { delay: 50 });
  const linkedPagePopover = page.locator('.linked-doc-popover');
  await expect(linkedPagePopover).toBeVisible();

  const importButton = page.locator(
    '.linked-doc-popover icon-button[data-id="import"]'
  );
  await expect(importButton).toBeVisible();
  await importButton.click();

  const importDialog = page.getByTestId('import-dialog');
  await expect(importDialog).toBeVisible();

  await page.getByTestId('modal-close-button').click();
  await expect(importDialog).not.toBeVisible();
});
