import postcss, {
  type AtRule,
  type Container,
  type Declaration,
  type Rule,
} from 'postcss';
import selectorParser, {
  type Node as SelectorNode,
  type Selector,
} from 'postcss-selector-parser';
import valueParser from 'postcss-value-parser';

import type { CssImportReport, EditorThemeMode } from '../types';
import {
  allowedAffineClasses,
  allowedAffineTags,
  allowedAttributeSelectors,
  allowedFontFamilies,
  allowedNestedAtRules,
  allowedPseudoSelectors,
  blockedAtRules,
  blockedProperties,
  blockedTyporaUiFragments,
  bundledFontFamilyMappings,
  EDITOR_THEME_SCOPE,
  MAX_EDITOR_THEME_CSS_BYTES,
  MAX_EDITOR_THEME_SANITIZED_CSS_BYTES,
  semanticClassMappings,
  semanticTagMappings,
} from './constants';
import { EditorThemeCssImportError } from './errors';

export {
  MAX_EDITOR_THEME_CSS_BYTES,
  MAX_EDITOR_THEME_SANITIZED_CSS_BYTES,
} from './constants';

type NormalizationContext = {
  report: CssImportReport;
  warnings: Set<string>;
  scope: string;
};

const selectorNodes = (selector: string): SelectorNode[] => {
  const parsed = selectorParser().astSync(selector);
  return parsed.nodes[0]?.nodes.map(node => node.clone()) ?? [];
};

const selectorHasBlockedUiFragment = (selector: string) => {
  const normalized = selector.toLowerCase();
  return blockedTyporaUiFragments.some(fragment =>
    normalized.includes(fragment)
  );
};

const trimSelectorCombinators = (selector: Selector) => {
  while (selector.first?.type === 'combinator') {
    selector.first.remove();
  }
  while (selector.last?.type === 'combinator') {
    selector.last.remove();
  }
};

const translateSelector = (
  sourceSelector: string,
  context: NormalizationContext
): { selector: string; translated: boolean } | null => {
  if (selectorHasBlockedUiFragment(sourceSelector)) {
    context.warnings.add('Ignored Typora application or editor UI selectors.');
    return null;
  }

  let translated = false;
  try {
    const parsed = selectorParser().astSync(sourceSelector);
    const output: string[] = [];

    for (const original of parsed.nodes) {
      const selector = original.clone();
      let supported = true;

      selector.walk(node => {
        if (!supported) return false;

        if (node.type === 'comment') {
          node.remove();
          translated = true;
          return;
        }

        if (node.type === 'universal') {
          supported = false;
          return false;
        }

        if (node.type === 'id') {
          if (node.value !== 'write') {
            supported = false;
            return false;
          }
          node.replaceWith(
            ...selectorNodes('.affine-page-root-block-container')
          );
          translated = true;
          return;
        }

        if (node.type === 'tag') {
          const tag = node.value.toLowerCase();
          if (tag === 'html' || tag === 'body') {
            node.remove();
            translated = true;
            return;
          }
          const mapping = semanticTagMappings[tag];
          if (mapping) {
            if (mapping !== tag) {
              node.replaceWith(...selectorNodes(mapping));
              translated = true;
            }
            return;
          }
          if (!allowedAffineTags.has(tag)) {
            supported = false;
          }
          return;
        }

        if (node.type === 'class') {
          if (node.value === 'page-editor-container') {
            node.remove();
            translated = true;
            return;
          }
          const mapping = semanticClassMappings[node.value];
          if (mapping) {
            node.replaceWith(...selectorNodes(mapping));
            translated = true;
            return;
          }
          if (!allowedAffineClasses.has(node.value)) {
            supported = false;
          }
          return;
        }

        if (node.type === 'attribute') {
          if (!allowedAttributeSelectors.has(node.attribute.toLowerCase())) {
            supported = false;
            return false;
          }
          if (node.attribute.toLowerCase() === 'data-theme') {
            node.remove();
            translated = true;
          }
          return;
        }

        if (node.type === 'pseudo') {
          if (node.value === ':root') {
            node.remove();
            translated = true;
            return;
          }
          if (!allowedPseudoSelectors.has(node.value.toLowerCase())) {
            supported = false;
            return false;
          }
        }
        return undefined;
      });

      if (!supported) {
        context.warnings.add('Ignored selectors outside the editor allowlist.');
        continue;
      }

      trimSelectorCombinators(selector);
      let inner = selector.toString().trim();
      if (
        !/(?:^|[\s>+~])affine-table(?![-\w])/.test(inner) &&
        /(?:^|[\s>+~])(?:thead|tbody|tr)(?![-\w])/.test(inner)
      ) {
        inner = `affine-table ${inner}`;
        translated = true;
      }
      output.push(inner ? `${context.scope} ${inner}` : context.scope);
    }

    return output.length ? { selector: output.join(', '), translated } : null;
  } catch {
    context.warnings.add('Ignored selectors that could not be parsed safely.');
    return null;
  }
};

const unquote = (value: string) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const quoteFontFamily = (value: string) =>
  /\s/.test(value) ? `"${value}"` : value;

const sanitizeFontFamily = (value: string, context: NormalizationContext) => {
  const families = value.split(',').map(unquote).filter(Boolean);
  const safeFamilies: string[] = [];
  let removedUnknown = false;

  for (const family of families) {
    const normalized = family.toLowerCase();
    const bundled = bundledFontFamilyMappings[normalized];
    if (bundled) {
      safeFamilies.push(quoteFontFamily(bundled));
    } else if (allowedFontFamilies.has(normalized)) {
      safeFamilies.push(quoteFontFamily(family));
    } else {
      removedUnknown = true;
    }
  }

  if (removedUnknown) {
    context.warnings.add(
      'Removed unavailable font families and used bundled or system fallbacks.'
    );
  }

  if (!safeFamilies.length) {
    return 'system-ui, sans-serif';
  }

  const hasGenericFallback = safeFamilies.some(family =>
    ['monospace', 'sans-serif', 'serif', 'system-ui'].includes(
      unquote(family).toLowerCase()
    )
  );
  if (!hasGenericFallback) {
    safeFamilies.push('system-ui', 'sans-serif');
  }
  return safeFamilies.join(', ');
};

const isFontFamilyCustomProperty = (property: string) =>
  /^--.*(?:font-family|font-sans|font-serif|font-mono)$/.test(property);

const containsUnsafeResource = (value: string) => {
  let unsafe = false;
  valueParser(value).walk(node => {
    if (
      node.type === 'function' &&
      ['url', 'expression', 'image-set', '-webkit-image-set'].includes(
        node.value.toLowerCase()
      )
    ) {
      unsafe = true;
      return false;
    }
    return;
  });
  return unsafe;
};

const sanitizeDeclaration = (
  source: Declaration,
  context: NormalizationContext
) => {
  const property = source.prop.toLowerCase();
  const value = source.value.trim();
  const reject = (warning: string) => {
    context.report.rejectedDeclarations++;
    context.warnings.add(warning);
    return null;
  };

  if (blockedProperties.has(property)) {
    return reject('Removed declarations that could escape editor geometry.');
  }
  if (
    property === 'position' &&
    !['static', 'relative', 'absolute'].includes(value.toLowerCase())
  ) {
    return reject('Removed declarations that could escape editor geometry.');
  }
  if (containsUnsafeResource(value)) {
    return reject(
      'Removed declarations containing external or local resources.'
    );
  }

  const declaration = source.clone();
  if (property === 'font-family' || isFontFamilyCustomProperty(property)) {
    declaration.value = sanitizeFontFamily(value, context);
  }
  if (declaration.important) {
    declaration.important = false;
    context.warnings.add(
      'Removed !important flags to preserve theme precedence.'
    );
  }
  return declaration;
};

const processRule = (
  source: Rule,
  target: Container,
  context: NormalizationContext
) => {
  const translated = translateSelector(source.selector, context);
  if (!translated) {
    context.report.ignoredRules++;
    return;
  }

  const rule = postcss.rule({ selector: translated.selector });
  source.each(node => {
    if (node.type !== 'decl') return;
    const declaration = sanitizeDeclaration(node, context);
    if (!declaration) return;
    rule.append(declaration);
    if (
      declaration.prop.toLowerCase() === 'color' &&
      translated.selector.includes('affine-link')
    ) {
      rule.append(
        declaration.clone({
          prop: '--affine-link-color',
        })
      );
    }
  });

  if (!rule.nodes?.length) {
    context.report.ignoredRules++;
    return;
  }

  target.append(rule);
  context.report.appliedRules++;
  if (translated.translated || translated.selector !== source.selector) {
    context.report.translatedRules++;
  }
};

const processContainer = (
  source: Container,
  target: Container,
  context: NormalizationContext
) => {
  source.each(node => {
    if (node.type === 'rule') {
      processRule(node, target, context);
      return;
    }
    if (node.type !== 'atrule') return;

    const name = node.name.toLowerCase();
    if (
      !allowedNestedAtRules.has(name) ||
      blockedAtRules.has(name) ||
      containsUnsafeResource(node.params)
    ) {
      context.report.ignoredRules++;
      context.warnings.add(`Ignored unsupported @${name} rule.`);
      return;
    }

    const atRule: AtRule = postcss.atRule({ name, params: node.params });
    processContainer(node, atRule, context);
    if (atRule.nodes?.length) {
      target.append(atRule);
    }
  });
};

const detectSourceKind = (css: string): CssImportReport['sourceKind'] => {
  if (/(?:#write|\.md-|\.CodeMirror|typora)/i.test(css)) return 'typora';
  if (
    /(?:page-editor|affine-(?:paragraph|list|code|table|link|divider))/i.test(
      css
    )
  ) {
    return 'affine';
  }
  return 'generic';
};

export function normalizeEditorThemeCss(input: {
  mode: EditorThemeMode;
  fileName: string;
  css: string;
  byteLength: number;
}): { sanitizedCss: string; report: CssImportReport } {
  if (!/\.css$/i.test(input.fileName)) {
    throw new EditorThemeCssImportError(
      'invalid-extension',
      'Editor themes must use a .css file.'
    );
  }
  const actualByteLength = new TextEncoder().encode(input.css).byteLength;
  if (
    input.byteLength > MAX_EDITOR_THEME_CSS_BYTES ||
    actualByteLength > MAX_EDITOR_THEME_CSS_BYTES
  ) {
    throw new EditorThemeCssImportError(
      'oversize',
      `Editor theme CSS must not exceed ${MAX_EDITOR_THEME_CSS_BYTES} bytes.`
    );
  }

  let source: postcss.Root;
  try {
    source = postcss.parse(input.css, { from: input.fileName });
  } catch (error) {
    throw new EditorThemeCssImportError(
      'parse-failure',
      'The CSS file could not be parsed.',
      { cause: error }
    );
  }

  const warnings = new Set<string>();
  const report: CssImportReport = {
    sourceKind: detectSourceKind(input.css),
    appliedRules: 0,
    translatedRules: 0,
    ignoredRules: 0,
    rejectedDeclarations: 0,
    warnings: [],
  };
  const output = postcss.root();
  processContainer(source, output, {
    report,
    warnings,
    scope: EDITOR_THEME_SCOPE[input.mode],
  });

  if (!report.appliedRules) {
    throw new EditorThemeCssImportError(
      'zero-supported-rules',
      'The CSS file does not contain supported document theme rules.'
    );
  }

  report.warnings = [...warnings];
  // Keep imported rules unlayered. BlockSuite's existing editor rules are
  // unlayered as well, and normal declarations outside a cascade layer always
  // outrank normal declarations inside one. The runtime style element is
  // mounted after PageEditor's static styles, so source order gives imports
  // precedence without weakening the editor-only selector scope.
  const sanitizedCss = output.toString();
  if (
    new TextEncoder().encode(sanitizedCss).byteLength >
    MAX_EDITOR_THEME_SANITIZED_CSS_BYTES
  ) {
    throw new EditorThemeCssImportError(
      'oversize',
      `Converted editor theme CSS must not exceed ${MAX_EDITOR_THEME_SANITIZED_CSS_BYTES} bytes.`
    );
  }

  return {
    sanitizedCss,
    report,
  };
}
