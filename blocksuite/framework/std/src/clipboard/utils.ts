import type { RootContentMap } from 'hast';

type HastUnionType<
  K extends keyof RootContentMap,
  V extends RootContentMap[K],
> = V;

export function onlyContainImgElement(
  ast: HastUnionType<keyof RootContentMap, RootContentMap[keyof RootContentMap]>
): 'yes' | 'no' | 'maybe' {
  if (ast.type === 'element') {
    switch (ast.tagName) {
      case 'html':
      case 'body':
        return ast.children.map(onlyContainImgElement).reduce((a, b) => {
          if (a === 'no' || b === 'no') {
            return 'no';
          }
          if (a === 'maybe' && b === 'maybe') {
            return 'maybe';
          }
          return 'yes';
        }, 'maybe');
      case 'img':
        return 'yes';
      case 'head':
        return 'maybe';
      default:
        return 'no';
    }
  }
  return 'maybe';
}

const MARKDOWN_SYNTAX_PATTERNS: RegExp[] = [
  /^#{1,6}\s+\S/m, // headings
  /^\s{0,3}[-*+]\s+\S/m, // bullet list
  /^\s{0,3}\d+\.\s+\S/m, // ordered list
  /^\s{0,3}>\s+/m, // blockquote
  /^\s{0,3}(?:```|~~~)/m, // fenced code
  /^\s{0,3}(?:[-*_] *){3,}$/m, // thematic break
  /^\s{0,3}\|.+\|\s*$/m, // table row
  /\*\*[^\s*][^*]*\*\*/, // bold (**)
  /__[^\s_][^_]*__/, // bold (__)
  /~~[^\s~][^~]*~~/, // strikethrough
  /`[^`\n]+`/, // inline code
  /\[[^\]]+\]\([^)\s]+\)/, // link / image
  /\$\$[\s\S]+?\$\$/, // block math
  // inline math: paired `$` on one line with no whitespace adjacent to the
  // delimiters (matches remark-math semantics, so currency like `$5 and $10`
  // is not misdetected while `$3x+1$` is).
  /(?:^|[^\\$])\$[^\s$](?:[^$\n]*[^\s$])?\$/,
];

/**
 * Heuristic check for whether a plain-text string contains Markdown syntax that
 * would produce meaningful structure once parsed (headings, lists, tables,
 * emphasis, code, math, links, ...).
 */
export function isMarkdownLikeText(text: string): boolean {
  return MARKDOWN_SYNTAX_PATTERNS.some(pattern => pattern.test(text));
}

function htmlTextContent(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body?.textContent ?? '';
  } catch {
    return '';
  }
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Detects clipboard payloads where the `text/html` flavour merely wraps the same
 * text as `text/plain` (i.e. it carries no richer formatting than the plain
 * text), which is what many Markdown preview panes / editors produce on copy.
 *
 * When this holds and the plain text looks like Markdown, the higher-priority
 * HTML adapter would otherwise insert the raw Markdown verbatim (literal `#`,
 * `**`, `|`, ...). Callers can use this to drop `text/html` so the plain-text
 * (Markdown) adapter parses it instead.
 */
export function htmlOnlyWrapsPlainText(html: string, plain: string): boolean {
  return (
    normalizeWhitespace(htmlTextContent(html)) === normalizeWhitespace(plain)
  );
}
