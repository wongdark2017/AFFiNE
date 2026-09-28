import { resolve } from 'node:path';

import { test, testResultDir } from '@affine-test/kit/playwright';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  waitForEditorLoad,
} from '@affine-test/kit/utils/page-logic';
import {
  closeSettingModal,
  openAppearancePanel,
  openSettingModal,
} from '@affine-test/kit/utils/setting';
import { expect, type Page } from '@playwright/test';

test.use({
  colorScheme: 'light',
});

const editorContainer = (page: Page) =>
  page.locator('.page-editor-container').first();
const firstParagraph = (page: Page) =>
  editorContainer(page).locator('affine-paragraph').first();
const detailHeader = (page: Page) =>
  page.getByTestId('split-view-panel').first().getByTestId('header');

async function setAppTheme(page: Page, mode: 'light' | 'dark') {
  await openSettingModal(page);
  await openAppearancePanel(page);
  await page.getByTestId(`${mode}-theme-trigger`).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
  await expect(editorContainer(page)).toHaveAttribute('data-theme', mode);
  await closeSettingModal(page);
}

async function openCssImportPanel(page: Page) {
  await page.goto('/theme-editor');
  const importedCssTab = page.getByTestId('theme-editor-imported-css-tab');
  await expect(importedCssTab).toBeVisible();
  await importedCssTab.click();
  await expect(page.getByText('Light CSS', { exact: true })).toBeVisible();
  await expect(page.getByText('Dark CSS', { exact: true })).toBeVisible();
}

async function importCss(
  page: Page,
  mode: 'light' | 'dark',
  fileName: string,
  css: string
) {
  await page.getByTestId(`theme-editor-${mode}-css-input`).setInputFiles({
    name: fileName,
    mimeType: 'text/css',
    buffer: Buffer.from(css),
  });
  await expect(page.getByText(fileName, { exact: true })).toBeVisible();
}

async function clearImportedCss(page: Page, mode: 'light' | 'dark') {
  await page.getByTestId(`theme-editor-${mode}-css-clear`).click();
  await page.getByTestId('confirm-modal-confirm').click();
  await expect(
    page.getByTestId(`theme-editor-${mode}-css-enable`).locator('input')
  ).not.toBeChecked();
}

test('uses the built-in GitHub theme only inside the page editor', async ({
  page,
}) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page, 'Theme scope title');
  await waitForEditorLoad(page);

  await page.keyboard.press('Enter');
  await page.keyboard.type('# Theme heading');

  const container = editorContainer(page);
  const paragraph = firstParagraph(page);
  const heading = container.locator('affine-paragraph .h1').first();
  const title = page.locator('doc-title .inline-editor').first();
  const appHeader = detailHeader(page);

  await expect(heading).toContainText('Theme heading');
  await expect(container).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(paragraph).toHaveCSS('color', 'rgb(51, 51, 51)');
  await expect(paragraph).toHaveCSS('font-family', /AFFiNE Editor Open Sans/);
  await expect(heading).toHaveCSS('border-bottom-color', 'rgb(238, 238, 238)');

  const lightFontLoaded = await page.evaluate(async () => {
    await document.fonts.load('16px "AFFiNE Editor Open Sans"', 'Theme');
    return Array.from(document.fonts).some(
      font =>
        font.family.includes('AFFiNE Editor Open Sans') &&
        font.status === 'loaded'
    );
  });
  expect(lightFontLoaded).toBe(true);
  await expect(title).not.toHaveCSS('font-family', /AFFiNE Editor/);
  await expect(appHeader).not.toHaveCSS('font-family', /AFFiNE Editor/);

  await setAppTheme(page, 'dark');

  await expect(container).toHaveCSS('background-color', 'rgb(10, 12, 16)');
  await expect(paragraph).toHaveCSS('color', 'rgb(240, 243, 246)');
  await expect(paragraph).toHaveCSS('font-family', /AFFiNE Editor Nunito Sans/);
  await expect(heading).toHaveCSS('border-bottom-color', 'rgb(122, 130, 142)');

  const darkFontLoaded = await page.evaluate(async () => {
    await document.fonts.load('16px "AFFiNE Editor Nunito Sans"', 'Theme');
    return Array.from(document.fonts).some(
      font =>
        font.family.includes('AFFiNE Editor Nunito Sans') &&
        font.status === 'loaded'
    );
  });
  expect(darkFontLoaded).toBe(true);
  await expect(title).not.toHaveCSS('font-family', /AFFiNE Editor/);
  await expect(appHeader).not.toHaveCSS('font-family', /AFFiNE Editor/);

  await page.screenshot({
    path: resolve(testResultDir, 'affine-github-dark-theme.png'),
  });
});

test('imports independent Canary CSS slots safely and atomically', async ({
  context,
  page,
}) => {
  const externalThemeRequests: string[] = [];
  context.on('request', request => {
    if (request.url().startsWith('https://theme-assets.invalid/')) {
      externalThemeRequests.push(request.url());
    }
  });

  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page, 'Imported theme title');
  await waitForEditorLoad(page);
  await page.keyboard.press('Enter');
  await page.keyboard.type('Imported theme paragraph');
  await page.keyboard.press('Enter');
  await page.keyboard.type('# Imported cascade heading');

  const paragraph = firstParagraph(page);
  const importedHeading = editorContainer(page)
    .locator('affine-paragraph .h1')
    .first();
  const title = page.locator('doc-title .inline-editor').first();
  const appHeader = detailHeader(page);
  const themeEditor = await context.newPage();
  await openCssImportPanel(themeEditor);

  await importCss(
    themeEditor,
    'light',
    'light-one.css',
    `
      @import url('https://theme-assets.invalid/import.css');
      .app-sidebar, [data-testid='header'] { display: none; }
      p {
        color: rgb(12, 34, 56);
        background-image: url('https://theme-assets.invalid/tracker.png');
      }
      h1 { font-size: 47px; margin-top: 29px; }
    `
  );
  await importCss(
    themeEditor,
    'dark',
    'dark-one.css',
    'p { color: rgb(210, 220, 230); }'
  );

  await expect(paragraph).toHaveCSS('color', 'rgb(12, 34, 56)');
  await expect(importedHeading).toHaveCSS('font-size', '47px');
  await expect(importedHeading).toHaveCSS('margin-top', '29px');
  await expect(title).toBeVisible();
  await expect(appHeader).toBeVisible();
  expect(externalThemeRequests).toEqual([]);

  await setAppTheme(page, 'dark');
  await expect(paragraph).toHaveCSS('color', 'rgb(210, 220, 230)');

  const darkEnable = themeEditor
    .getByTestId('theme-editor-dark-css-enable')
    .locator('input');
  await expect(darkEnable).toBeChecked();
  await themeEditor.getByTestId('theme-editor-dark-css-enable').click();
  await expect(darkEnable).not.toBeChecked();
  await expect(paragraph).toHaveCSS('color', 'rgb(240, 243, 246)');
  await themeEditor.getByTestId('theme-editor-dark-css-enable').click();
  await expect(darkEnable).toBeChecked();
  await expect(paragraph).toHaveCSS('color', 'rgb(210, 220, 230)');

  await importCss(
    themeEditor,
    'light',
    'light-two.css',
    'p { color: rgb(101, 67, 33); }'
  );
  await setAppTheme(page, 'light');
  await expect(paragraph).toHaveCSS('color', 'rgb(101, 67, 33)');

  await themeEditor.getByTestId('theme-editor-light-css-input').setInputFiles({
    name: 'invalid.css',
    mimeType: 'text/css',
    buffer: Buffer.from('p { color: red;'),
  });
  await expect(
    themeEditor.getByText(
      'The file contains invalid CSS and could not be parsed.',
      { exact: true }
    )
  ).toBeVisible();
  await expect(
    themeEditor.getByText('light-two.css', { exact: true })
  ).toBeVisible();
  await expect(paragraph).toHaveCSS('color', 'rgb(101, 67, 33)');

  await page.reload();
  await waitForEditorLoad(page);
  await expect(firstParagraph(page)).toHaveCSS('color', 'rgb(101, 67, 33)');
  await themeEditor.reload();
  await openCssImportPanel(themeEditor);
  await expect(
    themeEditor.getByText('light-two.css', { exact: true })
  ).toBeVisible();
  await expect(
    themeEditor.getByText('dark-one.css', { exact: true })
  ).toBeVisible();

  await clearImportedCss(themeEditor, 'light');
  await expect(firstParagraph(page)).toHaveCSS('color', 'rgb(51, 51, 51)');
  await setAppTheme(page, 'dark');
  await expect(firstParagraph(page)).toHaveCSS('color', 'rgb(210, 220, 230)');

  await clearImportedCss(themeEditor, 'dark');
  await expect(firstParagraph(page)).toHaveCSS('color', 'rgb(240, 243, 246)');
  expect(externalThemeRequests).toEqual([]);
});
