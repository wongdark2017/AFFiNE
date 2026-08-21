import {
  type MarkdownAdapterPreprocessor,
  MarkdownPreprocessorExtension,
} from '@blocksuite/affine-shared/adapters';

function escapeBrackets(text: string) {
  const pattern =
    /(```[\S\s]*?```|`.*?`)|\\\[([\S\s]*?[^\\])\\]|\\\((.*?)\\\)/g;
  return text.replaceAll(
    pattern,
    (match, codeBlock, squareBracket, roundBracket) => {
      if (codeBlock) {
        return codeBlock;
      } else if (squareBracket) {
        return `$$${squareBracket}$$`;
      } else if (roundBracket) {
        return `$${roundBracket}$`;
      }
      return match;
    }
  );
}

function escapeMhchem(text: string) {
  return text.replaceAll('$\\ce{', '$\\\\ce{').replaceAll('$\\pu{', '$\\\\pu{');
}

/**
 * A bare-LaTeX candidate: an unbroken run of TeX-ish characters, control
 * sequences and single-level brace groups. Spaces may only appear inside
 * braces (e.g. `R_{\rm eq}`), which keeps candidate spans tight in prose.
 */
const BARE_LATEX_SPAN_PATTERN =
  /(?:\\[A-Za-z]+|\\[,;!]|\{[^{}\n]*\}|[A-Za-z0-9=+/^_.,()-])+/g;

/**
 * Structures that essentially only appear in math: any superscript, or a
 * subscript introducing a brace group or control sequence (`R_{1.4}`,
 * `M_\odot`). Snake_case identifiers like `file_name` never qualify.
 */
const BARE_LATEX_STRUCTURE_PATTERN = /\^|_(?=[{\\])/;

/**
 * Common relational/operator commands directly attached to a digit
 * (`2.08\pm0.07`, `R\simeq13.02`). Backslash words in prose such as Windows
 * paths (`C:\Users\x`) never qualify.
 */
const BARE_LATEX_CMD_DIGIT_PATTERN =
  /\d\\(?:simeq|approx|propto|equiv|times|cdot|neq|leq|geq|div|pm|mp|ll|gg|sim|ne|le|ge)\b|\\(?:simeq|approx|propto|equiv|times|cdot|neq|leq|geq|div|pm|mp|ll|gg|sim|ne|le|ge)\d/;

function isBareLatexSpan(span: string): boolean {
  // A leading `^`/`_` would collide with footnote (`[^1]`) and emphasis
  // (`_text_`) syntax.
  if (span.startsWith('^') || span.startsWith('_')) {
    return false;
  }
  return (
    BARE_LATEX_STRUCTURE_PATTERN.test(span) ||
    BARE_LATEX_CMD_DIGIT_PATTERN.test(span)
  );
}

/**
 * Preprocess the content to protect code blocks and LaTeX expressions
 * reference issue: https://github.com/remarkjs/react-markdown/issues/785
 * reference comment: https://github.com/remarkjs/react-markdown/issues/785#issuecomment-2307567823
 * @param content - The content to preprocess
 * @returns The preprocessed content
 */
function preprocessLatex(content: string) {
  // Protect code blocks
  const codeBlocks: string[] = [];
  let preprocessedContent = content;
  preprocessedContent = preprocessedContent.replace(
    /(```[\s\S]*?```|`[^`\n]+`)/g,
    (_, code) => {
      codeBlocks.push(code);
      return `<<CODE_BLOCK_${codeBlocks.length - 1}>>`;
    }
  );

  // Protect existing LaTeX expressions.
  // The trailing alternative protects single-dollar inline math (`$...$`) that
  // has no whitespace adjacent to the delimiters, matching remark-math
  // semantics. Without this, the currency-escaping step below would break
  // digit-leading inline math such as `$3x+1$` (turning `$3` into `\$3`), while
  // genuine currency like `$5 and $10` still isn't matched here and stays
  // escaped.
  const latexExpressions: string[] = [];
  preprocessedContent = preprocessedContent.replace(
    /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\(.*?\\\)|\$[^\s$](?:[^$\n]*[^\s$])?\$)/g,
    match => {
      latexExpressions.push(match);
      return `<<LATEX_${latexExpressions.length - 1}>>`;
    }
  );

  // Wrap bare LaTeX spans in inline math delimiters. Formulas copied from
  // rendered previews (KaTeX/MathJax) arrive as raw TeX without `$`/`\(...\)`
  // delimiters and would otherwise stay plain text. Wrapped spans are stored
  // as protected expressions immediately so the currency escaping below
  // cannot mangle them.
  preprocessedContent = preprocessedContent.replace(
    BARE_LATEX_SPAN_PATTERN,
    span => {
      let core = span;
      let prefix = '';
      let suffix = '';
      // Keep sentence punctuation and unbalanced brackets out of the formula.
      for (;;) {
        const punct = /[.,]+$/.exec(core)?.[0];
        if (punct) {
          core = core.slice(0, -punct.length);
          suffix = punct + suffix;
          continue;
        }
        if (
          core.endsWith(')') &&
          core.split(')').length > core.split('(').length
        ) {
          core = core.slice(0, -1);
          suffix = `)${suffix}`;
          continue;
        }
        if (
          core.startsWith('(') &&
          core.split('(').length > core.split(')').length
        ) {
          core = core.slice(1);
          prefix = `${prefix}(`;
          continue;
        }
        break;
      }
      if (!isBareLatexSpan(core)) {
        return span;
      }
      latexExpressions.push(`$${core}$`);
      return `${prefix}<<LATEX_${latexExpressions.length - 1}>>${suffix}`;
    }
  );

  // Escape dollar signs that are likely currency indicators
  preprocessedContent = preprocessedContent.replace(/\$(?=\d)/g, '\\$');

  // Restore LaTeX expressions
  preprocessedContent = preprocessedContent.replace(
    /<<LATEX_(\d+)>>/g,
    (_, index) => latexExpressions[parseInt(index)]
  );

  // Restore code blocks
  preprocessedContent = preprocessedContent.replace(
    /<<CODE_BLOCK_(\d+)>>/g,
    (_, index) => codeBlocks[parseInt(index)]
  );

  // Apply additional escaping functions
  preprocessedContent = escapeBrackets(preprocessedContent);
  preprocessedContent = escapeMhchem(preprocessedContent);

  return preprocessedContent;
}

const latexPreprocessor: MarkdownAdapterPreprocessor = {
  name: 'latex',
  levels: ['block', 'slice', 'doc'],
  preprocess: content => {
    return preprocessLatex(content);
  },
};

export const LatexMarkdownPreprocessorExtension =
  MarkdownPreprocessorExtension(latexPreprocessor);
