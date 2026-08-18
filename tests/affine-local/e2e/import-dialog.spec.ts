import { importFile } from '@affine-test/kit/utils/attachment';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  waitForAllPagesLoad,
  waitForEditorLoad,
  waitForEmptyEditor,
} from '@affine-test/kit/utils/page-logic';
import { clickSideBarAllPageButton } from '@affine-test/kit/utils/sidebar';
import test, { expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page);
  await waitForEmptyEditor(page);
});

async function waitForImportDialogClosed(page: Page) {
  await expect(page.getByTestId('import-dialog')).not.toBeVisible({
    timeout: 15000,
  });
}

async function createOrganizeFolder(page: Page, name: string) {
  await page.getByTestId('navigation-panel-bar-add-organize-button').click();
  const input = page.getByTestId('rename-modal-input');
  await expect(input).toBeVisible();
  await input.fill(name);
  await input.press('Enter');
  await expect(input).not.toBeVisible();
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
}

function locateOrganizeFolder(page: Page, name: string) {
  return page
    .locator('[data-testid^="navigation-panel-folder-"]')
    .filter({ hasText: name })
    .first();
}

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

  await waitForImportDialogClosed(page);

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

  await waitForImportDialogClosed(page);
  await expect(page.getByText(/broken-archive\.zip/)).toBeVisible();

  // The healthy zip should still be imported.
  await clickSideBarAllPageButton(page);
  await waitForAllPagesLoad(page);
  const docList = page.locator('[data-testid="doc-list-item"]');
  await expect(docList.filter({ hasText: 'beta-one' })).toBeVisible();
});

test('Import markdown zip into an organize folder', async ({ page }) => {
  await createOrganizeFolder(page, 'Target Folder');
  const folder = locateOrganizeFolder(page, 'Target Folder');
  await folder.hover();
  await folder
    .getByTestId('navigation-panel-tree-node-operation-button')
    .click();
  await page.getByTestId('navigation-panel-folder-import').click();

  const importDialog = page.getByTestId('import-dialog');
  await expect(importDialog).toBeVisible();

  await importFile(page, 'markdown-zip-a.zip', async page => {
    await page
      .getByTestId('editor-option-menu-import-markdown-with-media')
      .click();
  });

  await waitForImportDialogClosed(page);

  // The zip's folder tree and top-level docs should land under the target folder.
  await expect(folder.getByText('notes', { exact: true })).toBeVisible();
  await expect(folder.getByText('alpha-one', { exact: true })).toBeVisible();
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
