import { describe, expect, test } from 'vitest';

import { EditorThemeCssImportError } from './errors';
import {
  MAX_EDITOR_THEME_CSS_BYTES,
  MAX_EDITOR_THEME_SANITIZED_CSS_BYTES,
  normalizeEditorThemeCss,
} from './normalize';

const normalize = (
  css: string,
  options: Partial<{
    mode: 'light' | 'dark';
    fileName: string;
    byteLength: number;
  }> = {}
) =>
  normalizeEditorThemeCss({
    mode: options.mode ?? 'light',
    fileName: options.fileName ?? 'theme.css',
    css,
    byteLength: options.byteLength ?? new TextEncoder().encode(css).byteLength,
  });

const expectImportError = (
  callback: () => unknown,
  code: EditorThemeCssImportError['code']
) => {
  try {
    callback();
    throw new Error('Expected normalizeEditorThemeCss to throw');
  } catch (error) {
    expect(error).toBeInstanceOf(EditorThemeCssImportError);
    expect((error as EditorThemeCssImportError).code).toBe(code);
  }
};

describe('normalizeEditorThemeCss', () => {
  test('accepts the 512 KiB boundary and rejects one additional byte', () => {
    expect(
      normalize(':root { color: #333; }', {
        byteLength: MAX_EDITOR_THEME_CSS_BYTES,
      }).report.appliedRules
    ).toBe(1);

    expectImportError(
      () =>
        normalize(':root { color: #333; }', {
          byteLength: MAX_EDITOR_THEME_CSS_BYTES + 1,
        }),
      'oversize'
    );
  });

  test('checks the actual UTF-8 source size instead of trusting metadata', () => {
    const oversizedCss = `/*${'界'.repeat(MAX_EDITOR_THEME_CSS_BYTES)}*/p{color:red}`;

    expectImportError(
      () => normalize(oversizedCss, { byteLength: 1 }),
      'oversize'
    );
  });

  test('rejects converted output larger than 1 MiB', () => {
    const css = `${'p,'.repeat(24_000)}p { color: red; }`;
    expect(new TextEncoder().encode(css).byteLength).toBeLessThan(
      MAX_EDITOR_THEME_CSS_BYTES
    );

    expectImportError(() => normalize(css), 'oversize');
    expect(MAX_EDITOR_THEME_SANITIZED_CSS_BYTES).toBe(1024 * 1024);
  });

  test('rejects non-CSS files and malformed CSS', () => {
    expectImportError(
      () => normalize('body { color: red; }', { fileName: 'theme.txt' }),
      'invalid-extension'
    );
    expectImportError(() => normalize('body { color: red;'), 'parse-failure');
  });

  test('maps common Typora and Markdown selectors to BlockSuite content', () => {
    const result = normalize(`
      :root { --theme-color: #333; }
      html, body { color: #333; }
      #write { max-width: 860px; }
      #write h1, h2, h3, h4, h5, h6 { font-weight: 600; }
      p { line-height: 1.6; }
      blockquote { border-left: 4px solid #ddd; }
      ul, ol, li, .task-list-item { margin-block: 0.25em; }
      pre, .md-fences { background: #f8f8f8; }
      code, tt { font-family: "Source Code Pro", monospace; }
      table, thead, tbody, tr, th, td { border-color: #ddd; }
      a { color: #4183c4; }
      hr { border-color: #eee; }
      img { max-width: 100%; }
      .md-math-block, .katex { color: inherit; }
      strong, em, mark, u, del { color: inherit; }
    `);

    expect(result.report.sourceKind).toBe('typora');
    expect(result.sanitizedCss).toContain(
      ".page-editor-container[data-theme='light']"
    );
    expect(result.sanitizedCss).toContain('.affine-page-root-block-container');
    expect(result.sanitizedCss).toContain('affine-paragraph .h1');
    expect(result.sanitizedCss).toContain('affine-paragraph .quote');
    expect(result.sanitizedCss).toContain('affine-list');
    expect(result.sanitizedCss).toContain(
      'affine-code .affine-code-block-container'
    );
    expect(result.sanitizedCss).toContain('affine-table tr');
    expect(result.sanitizedCss).toContain('affine-table-cell td');
    expect(result.sanitizedCss).toContain('affine-link a');
    expect(result.sanitizedCss).toContain('--affine-link-color: #4183c4');
    expect(result.sanitizedCss).toContain('affine-divider');
    expect(result.sanitizedCss).toContain('affine-image img');
    expect(result.sanitizedCss).toContain('.katex');
  });

  test('targets the actual BlockSuite heading, quote, table, and link DOM', () => {
    const result = normalize(`
      h1, h2, h3, h4, h5, h6 { font-weight: 600; }
      blockquote { color: #777; }
      tr { border-color: #ddd; }
      th, td { background: #fff; }
      a:hover { color: #4183c4; }
    `);

    for (const heading of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
      expect(result.sanitizedCss).toContain(`affine-paragraph .${heading}`);
      expect(result.sanitizedCss).not.toContain(`affine-paragraph.${heading}`);
    }
    expect(result.sanitizedCss).toContain('affine-paragraph .quote');
    expect(result.sanitizedCss).not.toContain('affine-paragraph.quote');
    expect(result.sanitizedCss).toContain('affine-table tr');
    expect(result.sanitizedCss).toContain('affine-table-cell td');
    expect(result.sanitizedCss).toMatch(
      /affine-link a:hover\s*\{[^}]*color:\s*#4183c4;[^}]*--affine-link-color:\s*#4183c4/
    );
  });

  test('targets the real table element without duplicating table hosts', () => {
    const result = normalize(`
      table tbody tr td, table tr th { border: 1px solid #ddd; }
      tr { min-height: 24px; }
    `);

    expect(result.sanitizedCss).toContain(
      'affine-table table tbody tr affine-table-cell td'
    );
    expect(result.sanitizedCss).toContain(
      'affine-table table tr affine-table-cell td'
    );
    expect(result.sanitizedCss).toContain(
      ".page-editor-container[data-theme='light'] affine-table tr"
    );
    expect(result.sanitizedCss).not.toMatch(
      /affine-table(?:\s+affine-table|\s*>\s*affine-table)/
    );
  });

  test('maps Typora .write roots to the page body content root', () => {
    const result = normalize(`
      .write h1 { font-size: 24px; }
      .write table { width: 100%; }
      .write img { max-width: 100%; }
    `);

    expect(result.report.appliedRules).toBe(3);
    expect(result.sanitizedCss).toContain(
      '.affine-page-root-block-container affine-paragraph .h1'
    );
    expect(result.sanitizedCss).toContain(
      '.affine-page-root-block-container affine-table table'
    );
    expect(result.sanitizedCss).toContain(
      '.affine-page-root-block-container affine-image img'
    );
  });

  test('retains only allowlisted AFFiNE editor selectors', () => {
    const result = normalize(`
      affine-paragraph .h1 affine-link { color: blue; }
      .page-editor-container affine-code .affine-code-block-container {
        background: #111;
      }
      .app-sidebar { display: none; }
    `);

    expect(result.report.sourceKind).toBe('affine');
    expect(result.report.appliedRules).toBe(2);
    expect(result.report.ignoredRules).toBe(1);
    expect(result.sanitizedCss).toContain('affine-paragraph .h1 affine-link');
    expect(result.sanitizedCss).toContain(
      'affine-code .affine-code-block-container'
    );
    expect(result.sanitizedCss).not.toContain('.app-sidebar');
  });

  test('ignores Typora chrome and CodeMirror selectors', () => {
    const result = normalize(`
      #write p { color: #333; }
      #typora-sidebar, .typora-quick-open, .megamenu-menu,
      .preferences, .window-title, .CodeMirror-gutters, .md-tooltip {
        display: none;
      }
    `);

    expect(result.report.appliedRules).toBe(1);
    expect(result.report.ignoredRules).toBe(1);
    expect(result.sanitizedCss).not.toMatch(
      /typora-sidebar|quick-open|megamenu|preferences|window-title|CodeMirror|tooltip/
    );
  });

  test('removes resource at-rules, URLs, overlays, z-index, and important flags', () => {
    const result = normalize(`
      @import url('https://example.com/theme.css');
      @font-face { font-family: Remote; src: url('./font.woff2'); }
      @namespace svg url(http://www.w3.org/2000/svg);
      @page { margin: 0; }
      @keyframes spin { to { transform: rotate(1turn); } }
      #write {
        background-image: url(data:image/png;base64,AAAA);
        position: fixed;
        z-index: 999999;
        pointer-events: none;
        user-select: none;
        color: red !important;
        line-height: 1.6;
      }
    `);

    expect(result.sanitizedCss).not.toMatch(
      /@import|@font-face|@namespace|@page|@keyframes/
    );
    expect(result.sanitizedCss).not.toMatch(
      /url\(|position:\s*fixed|z-index|pointer-events|user-select|!important/
    );
    expect(result.sanitizedCss).toContain('color: red');
    expect(result.sanitizedCss).toContain('line-height: 1.6');
    expect(result.report.ignoredRules).toBe(5);
    expect(result.report.rejectedDeclarations).toBe(5);
    expect(result.report.warnings.length).toBeGreaterThan(0);
  });

  test('keeps safe media and supports rules while sanitizing descendants', () => {
    const result = normalize(`
      @media (max-width: 600px) {
        #write p { font-size: 14px; background: url('./paper.png'); }
      }
      @supports (font-variation-settings: normal) {
        h1 { font-variation-settings: 'wght' 650; }
      }
    `);

    expect(result.sanitizedCss).toContain('@media (max-width: 600px)');
    expect(result.sanitizedCss).toContain(
      '@supports (font-variation-settings: normal)'
    );
    expect(result.sanitizedCss).not.toContain('paper.png');
    expect(result.report.appliedRules).toBe(2);
  });

  test('maps bundled fonts, keeps safe system/code families, and removes unknown families', () => {
    const result = normalize(`
      :root {
        --font-sans: "Anthropic Sans Web Text", "Noto Sans SC", system-ui;
        --font-serif: "Anthropic Serif Web Text", "Noto Serif SC", Georgia, serif;
        --font-mono: "Anthropic Mono Variable", "Source Han Sans SC", ui-monospace, monospace;
      }
      body {
        font-family: "Claude Sans", "Open Sans", Helvetica, Arial, sans-serif;
      }
      code {
        font-family: "Mystery Mono", "SF Mono", "IBM Plex Mono", monospace;
      }
      blockquote { font-family: "Unknown Family"; }
      h1 { font-family: "Nunito Sans", "Noto Sans SC", Inter, system-ui; }
      h2 { font-family: "Noto Serif SC", serif; }
    `);

    expect(result.sanitizedCss).not.toMatch(
      /Anthropic|Claude Sans|Mystery Mono|Unknown Family/
    );
    expect(result.sanitizedCss).toContain('AFFiNE Editor Open Sans');
    expect(result.sanitizedCss).toContain('AFFiNE Editor Nunito Sans');
    expect(result.sanitizedCss).toContain('AFFiNE Editor Noto Sans SC');
    expect(result.sanitizedCss).toContain('AFFiNE Editor Noto Serif SC');
    expect(result.sanitizedCss).toContain('IBM Plex Mono');
    expect(result.sanitizedCss).toContain('system-ui');
    expect(result.sanitizedCss).toContain('sans-serif');
  });

  test('uses the matching mode prefix without a named cascade layer', () => {
    const light = normalize('p { color: black; }').sanitizedCss;
    const dark = normalize('p { color: white; }', {
      mode: 'dark',
    }).sanitizedCss;

    expect(light).toMatch(/^\.page-editor-container/);
    expect(light).not.toContain('@layer');
    expect(light).toContain("[data-theme='light']");
    expect(light).not.toContain("[data-theme='dark']");
    expect(dark).toContain("[data-theme='dark']");
    expect(dark).not.toContain("[data-theme='light']");
  });

  test('produces deterministic CSS and report counts', () => {
    const css = `
      #write h1 { color: #333; }
      .CodeMirror { color: red; }
      p { background: url('./asset.png'); margin: 1em; }
    `;
    const first = normalize(css);
    const second = normalize(css);

    expect(first).toEqual(second);
    expect(first.report).toMatchObject({
      sourceKind: 'typora',
      appliedRules: 2,
      translatedRules: 2,
      ignoredRules: 1,
      rejectedDeclarations: 1,
    });
  });

  test('rejects stylesheets with no supported document rules', () => {
    expectImportError(
      () => normalize('.app-sidebar { color: red; }'),
      'zero-supported-rules'
    );
  });
});
