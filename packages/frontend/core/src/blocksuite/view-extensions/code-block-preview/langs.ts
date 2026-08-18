import { CodeBlockConfigExtension } from '@blocksuite/affine/blocks/code';
import type { ExtensionType } from '@blocksuite/affine/store';
import type { BundledLanguageInfo } from 'shiki';
import { bundledLanguagesInfo } from 'shiki';

const latexInfo = bundledLanguagesInfo.find(info => info.id === 'latex');

/**
 * `tikz` is not a shiki bundled language: register it as a custom entry
 * that reuses the latex grammar (renamed to `tikz` so the highlighter can
 * resolve it by the code block's language id).
 */
const tikzLanguageInfo: BundledLanguageInfo | null = latexInfo
  ? {
      id: 'tikz',
      name: 'TikZ',
      aliases: ['pgf'],
      import: async () => {
        const latex = await latexInfo.import();
        const base =
          latex.default.find(grammar => grammar.name === 'latex') ??
          latex.default.at(-1);
        if (!base) {
          return latex;
        }
        return {
          default: [...latex.default, { ...base, name: 'tikz', aliases: [] }],
        };
      },
    }
  : null;

export function getExtendedLangs(): BundledLanguageInfo[] {
  return tikzLanguageInfo
    ? [...bundledLanguagesInfo, tikzLanguageInfo]
    : [...bundledLanguagesInfo];
}

/**
 * Extends the code block language list with non-shiki languages.
 * `CodeBlockConfigExtension` overrides the DI config for `affine:code`, so
 * this must keep providing `showLineNumbers: false` on mobile, where the
 * default `CodeBlockViewExtension` registers that flag through the same
 * config identifier.
 */
export function CodeBlockLangsExtension(options: {
  isMobile: boolean;
}): ExtensionType {
  return CodeBlockConfigExtension({
    langs: getExtendedLangs(),
    ...(options.isMobile ? { showLineNumbers: false } : {}),
  });
}
