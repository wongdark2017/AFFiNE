import { css } from 'lit';

/**
 * The built-in Markdown presentation for the page editor.
 *
 * Keep every selector rooted at `.page-editor-container`: PageEditor is a
 * shadowless element, so an unscoped selector here would leak into the app
 * shell. The custom properties below are intentionally private to this theme
 * and leave the user's base font size and editor width untouched.
 */
export const editorMarkdownTheme = css`
  .page-editor-container[data-theme='light'] {
    --affine-editor-theme-font-family:
      'AFFiNE Editor Open Sans', 'AFFiNE Editor Noto Sans SC', 'Helvetica Neue',
      Helvetica, Arial, sans-serif;
    --affine-editor-theme-code-font-family:
      'SFMono-Regular', 'SF Mono', var(--affine-font-code-family);
    --affine-editor-theme-background: #ffffff;
    --affine-editor-theme-text: #333333;
    --affine-editor-theme-muted-text: #777777;
    --affine-editor-theme-link: #4183c4;
    --affine-editor-theme-border: #dfe2e5;
    --affine-editor-theme-heading-border: #eeeeee;
    --affine-editor-theme-code-background: #f8f8f8;
    --affine-editor-theme-inline-code-background: #f3f4f4;
    --affine-editor-theme-alternate-row: #f8f8f8;
  }

  .page-editor-container[data-theme='dark'] {
    --affine-editor-theme-font-family:
      'AFFiNE Editor Nunito Sans', 'AFFiNE Editor Noto Sans SC',
      'Helvetica Neue', Helvetica, Arial, sans-serif;
    --affine-editor-theme-code-font-family:
      'SFMono-Regular', 'SF Mono', var(--affine-font-code-family);
    --affine-editor-theme-background: #0a0c10;
    --affine-editor-theme-text: #f0f3f6;
    --affine-editor-theme-muted-text: #bdc4cc;
    --affine-editor-theme-link: #58a6ff;
    --affine-editor-theme-border: #7a828e;
    --affine-editor-theme-heading-border: #7a828e;
    --affine-editor-theme-code-background: #272b33;
    --affine-editor-theme-inline-code-background: rgba(240, 246, 252, 0.15);
    --affine-editor-theme-alternate-row: #192534;
  }

  .page-editor-container[data-theme='light'],
  .page-editor-container[data-theme='dark'],
  .page-editor-container[data-theme='light'] .affine-page-root-block-container,
  .page-editor-container[data-theme='dark'] .affine-page-root-block-container {
    background-color: var(--affine-editor-theme-background);
  }

  .page-editor-container[data-theme='light']
    :where(affine-paragraph, affine-list, affine-code, affine-table),
  .page-editor-container[data-theme='dark']
    :where(affine-paragraph, affine-list, affine-code, affine-table) {
    color: var(--affine-editor-theme-text);
  }

  .page-editor-container[data-theme='light']
    :where(affine-paragraph, affine-list, affine-table),
  .page-editor-container[data-theme='dark']
    :where(affine-paragraph, affine-list, affine-table) {
    font-family: var(--affine-editor-theme-font-family);
    font-size: var(--affine-font-base);
    line-height: 1.6;
  }

  .page-editor-container[data-theme='light']
    :where(affine-paragraph, affine-list, affine-table),
  .page-editor-container[data-theme='dark']
    :where(affine-paragraph, affine-list, affine-table) {
    --affine-link-color: var(--affine-editor-theme-link);
    --affine-background-code-block: var(
      --affine-editor-theme-inline-code-background
    );
  }

  .page-editor-container[data-theme='light'] affine-paragraph,
  .page-editor-container[data-theme='dark'] affine-paragraph {
    --affine-font-h-1: 2.25em;
    --affine-font-h-2: 1.75em;
    --affine-font-h-3: 1.5em;
    --affine-font-h-4: 1.25em;
    --affine-font-h-5: 1em;
    --affine-font-h-6: 1em;
    --affine-paragraph-margin: 0.8em 0;
  }

  .page-editor-container[data-theme='light'] affine-list,
  .page-editor-container[data-theme='dark'] affine-list {
    --affine-list-margin: 0.8em 0;
  }

  .page-editor-container[data-theme='light']
    affine-paragraph
    :where(.h1, .h2, .h3, .h4, .h5, .h6),
  .page-editor-container[data-theme='dark']
    affine-paragraph
    :where(.h1, .h2, .h3, .h4, .h5, .h6) {
    font-family: var(--affine-editor-theme-font-family);
  }

  .page-editor-container[data-theme='light'] affine-paragraph :where(.h1, .h2),
  .page-editor-container[data-theme='dark'] affine-paragraph :where(.h1, .h2) {
    padding-bottom: 0.3em;
    border-bottom: 1px solid var(--affine-editor-theme-heading-border);
  }

  .page-editor-container[data-theme='light'] affine-paragraph .h6,
  .page-editor-container[data-theme='dark'] affine-paragraph .h6 {
    color: var(--affine-editor-theme-muted-text);
  }

  .page-editor-container[data-theme='light'] affine-paragraph .quote,
  .page-editor-container[data-theme='dark'] affine-paragraph .quote {
    --affine-quote-color: var(--affine-editor-theme-border);
    color: var(--affine-editor-theme-muted-text);
  }

  .page-editor-container[data-theme='dark'] affine-paragraph .quote {
    color: var(--affine-editor-theme-text);
  }

  .page-editor-container[data-theme='light']
    :where(affine-paragraph, affine-list, affine-table)
    code,
  .page-editor-container[data-theme='dark']
    :where(affine-paragraph, affine-list, affine-table)
    code {
    border: 1px solid var(--affine-editor-theme-border);
    border-radius: 3px;
    background-color: var(--affine-editor-theme-inline-code-background);
    font-family: var(--affine-editor-theme-code-font-family);
  }

  .page-editor-container[data-theme='light'] affine-code,
  .page-editor-container[data-theme='dark'] affine-code {
    --affine-background-code-block: var(--affine-editor-theme-code-background);
    --affine-font-code-family: var(--affine-editor-theme-code-font-family);
    --affine-text-secondary: var(--affine-editor-theme-muted-text);
    --affine-text-secondary-color: var(--affine-editor-theme-muted-text);
  }

  .page-editor-container[data-theme='light']
    affine-code
    .affine-code-block-container,
  .page-editor-container[data-theme='dark']
    affine-code
    .affine-code-block-container {
    border: 1px solid var(--affine-editor-theme-border);
  }

  .page-editor-container[data-theme='light'] affine-divider,
  .page-editor-container[data-theme='dark'] affine-divider {
    --affine-divider-color: var(--affine-editor-theme-border);
  }

  .page-editor-container[data-theme='light'] affine-table,
  .page-editor-container[data-theme='dark'] affine-table {
    --affine-v2-table-border: var(--affine-editor-theme-border);
  }

  .page-editor-container[data-theme='light'] affine-table tr:nth-of-type(2n) td,
  .page-editor-container[data-theme='dark'] affine-table tr:nth-of-type(2n) td {
    background-color: var(--affine-editor-theme-alternate-row);
  }

  .page-editor-container[data-theme='light'] affine-link,
  .page-editor-container[data-theme='dark'] affine-link {
    --affine-link-color: var(--affine-editor-theme-link);
  }

  .page-editor-container[data-theme='light']
    :where(affine-latex, affine-latex-node),
  .page-editor-container[data-theme='dark']
    :where(affine-latex, affine-latex-node) {
    color: var(--affine-editor-theme-text);
  }

  .page-editor-container[data-theme='light'] affine-image img,
  .page-editor-container[data-theme='dark'] affine-image img {
    max-width: 100%;
  }
`;
