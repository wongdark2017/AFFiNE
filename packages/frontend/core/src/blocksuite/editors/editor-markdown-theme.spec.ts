import { describe, expect, test } from 'vitest';

import { editorMarkdownTheme } from './editor-markdown-theme';

describe('editorMarkdownTheme', () => {
  test('keeps the built-in theme scoped to PageEditor light and dark roots', () => {
    const cssText = editorMarkdownTheme.cssText;

    expect(cssText).not.toContain('@layer');
    expect(cssText).toContain(".page-editor-container[data-theme='light']");
    expect(cssText).toContain(".page-editor-container[data-theme='dark']");
    expect(cssText).not.toMatch(/(^|[\s,{])(?:html|body)(?=[\s,{])/);
    expect(cssText).not.toContain('affine-edgeless');
    expect(cssText).not.toContain('doc-title');
  });

  test('preserves user font scaling and editor width variables', () => {
    const cssText = editorMarkdownTheme.cssText;

    expect(cssText).toContain('var(--affine-font-base)');
    expect(cssText).not.toMatch(/--affine-font-base\s*:/);
    expect(cssText).not.toMatch(/--affine-editor-width\s*:/);
  });
});
