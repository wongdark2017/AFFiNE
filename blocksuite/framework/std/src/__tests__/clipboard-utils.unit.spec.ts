import { describe, expect, test } from 'vitest';

import {
  htmlOnlyWrapsPlainText,
  isMarkdownLikeText,
} from '../clipboard/utils.js';

describe('isMarkdownLikeText', () => {
  test.each([
    ['heading', '# Title'],
    ['deep heading', '###### Title'],
    ['bullet list', '- item'],
    ['plus bullet list', '+ item'],
    ['ordered list', '1. item'],
    ['blockquote', '> quote'],
    ['fenced code', '```ts\nconst a = 1;\n```'],
    ['thematic break', '---'],
    ['table row', '| a | b |\n| - | - |'],
    ['bold', 'some **bold** text'],
    ['bold underscore', 'some __bold__ text'],
    ['strikethrough', 'some ~~gone~~ text'],
    ['inline code', 'use `code` here'],
    ['link', 'see [docs](https://affine.pro)'],
    ['block math', '$$\nE=mc^2\n$$'],
    ['inline math', 'energy $E=mc^2$ here'],
    ['digit-leading inline math', 'value $3x+1$ here'],
  ])('detects %s as markdown', (_, text) => {
    expect(isMarkdownLikeText(text)).toBe(true);
  });

  test.each([
    ['plain sentence', 'Hello world, this is a normal sentence.'],
    ['currency only', 'The price is $5 and $10 for the bundle.'],
    ['plain multiline', 'first line\nsecond line\nthird line'],
    ['empty', ''],
  ])('treats %s as non-markdown', (_, text) => {
    expect(isMarkdownLikeText(text)).toBe(false);
  });
});

describe('htmlOnlyWrapsPlainText', () => {
  test('true when html merely wraps the same markdown text', () => {
    const plain = '# Title\n\n**bold** and `code`';
    const html = `<meta charset="utf-8"><div># Title</div><div></div><div>**bold** and \`code\`</div>`;
    expect(htmlOnlyWrapsPlainText(html, plain)).toBe(true);
  });

  test('true ignoring whitespace differences from block wrappers', () => {
    const plain = '- a\n- b\n- c';
    const html = `<pre>- a\n- b\n- c\n</pre>`;
    expect(htmlOnlyWrapsPlainText(html, plain)).toBe(true);
  });

  test('false when html carries real rendered formatting', () => {
    // Rendered HTML strips the markdown markers, so text content differs.
    const plain = '# Title\n**bold**';
    const html = `<h1>Title</h1><p><strong>bold</strong></p>`;
    expect(htmlOnlyWrapsPlainText(html, plain)).toBe(false);
  });

  test('false when html has extra content', () => {
    const plain = '# Title';
    const html = `<div># Title</div><div>extra paragraph not in plain text</div>`;
    expect(htmlOnlyWrapsPlainText(html, plain)).toBe(false);
  });
});
