import { Framework, MemoryMemento } from '@toeverything/infra';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { GlobalState } from '../../storage';
import { EditorThemeCssImportError } from '../css-import/errors';
import { normalizeEditorThemeCss } from '../css-import/normalize';
import type {
  CssImportReport,
  ImportedEditorStylesheet,
  ImportedEditorThemeState,
} from '../types';
import { ThemeEditorService } from './theme-editor';

const report: CssImportReport = {
  sourceKind: 'typora',
  appliedRules: 1,
  translatedRules: 1,
  ignoredRules: 0,
  rejectedDeclarations: 0,
  warnings: [],
};

const stylesheet = (
  fileName: string,
  overrides: Partial<ImportedEditorStylesheet> = {}
): ImportedEditorStylesheet => ({
  fileName,
  byteLength: 24,
  importedAt: 123,
  enabled: true,
  sanitizedCss: `.page-editor-container[data-theme='light'] { /* ${fileName} */ }`,
  report,
  ...overrides,
});

describe('ThemeEditorService imported editor CSS', () => {
  let globalState: MemoryMemento;
  let service: ThemeEditorService;

  beforeEach(() => {
    globalState = new MemoryMemento();
    const framework = new Framework();
    framework.service(ThemeEditorService, [GlobalState]);
    framework.impl(GlobalState, globalState);
    service = framework.provider().get(ThemeEditorService);
  });

  test('starts with an empty versioned state', () => {
    expect(service.importedThemeCss$.value).toEqual({ version: 1 });
    expect(service.activeImportedCss$.value).toEqual({});
  });

  test('persists light and dark slots independently', () => {
    service.saveImportedCss('light', stylesheet('light.css'));
    service.saveImportedCss('dark', stylesheet('dark.css'));

    expect(service.importedThemeCss$.value).toEqual({
      version: 1,
      light: stylesheet('light.css'),
      dark: stylesheet('dark.css'),
    });
    expect(service.activeImportedCss$.value).toEqual({
      light: stylesheet('light.css').sanitizedCss,
      dark: stylesheet('dark.css').sanitizedCss,
    });
  });

  test('replaces only the selected slot after a successful save', () => {
    service.saveImportedCss('light', stylesheet('old.css'));
    service.saveImportedCss('dark', stylesheet('dark.css'));
    service.saveImportedCss('light', stylesheet('new.css'));

    expect(service.importedThemeCss$.value.light?.fileName).toBe('new.css');
    expect(service.importedThemeCss$.value.dark?.fileName).toBe('dark.css');
  });

  test('enables and disables a slot without deleting it', () => {
    service.saveImportedCss('light', stylesheet('light.css'));
    service.setImportedCssEnabled('light', false);

    expect(service.importedThemeCss$.value.light).toMatchObject({
      fileName: 'light.css',
      enabled: false,
    });
    expect(service.activeImportedCss$.value).toEqual({});

    service.setImportedCssEnabled('light', true);
    expect(service.activeImportedCss$.value.light).toContain('light.css');
  });

  test('clears only the selected slot', () => {
    service.saveImportedCss('light', stylesheet('light.css'));
    service.saveImportedCss('dark', stylesheet('dark.css'));

    service.clearImportedCss('light');

    expect(service.importedThemeCss$.value).toEqual({
      version: 1,
      dark: stylesheet('dark.css'),
    });
    expect(service.activeImportedCss$.value).toEqual({
      dark: stylesheet('dark.css').sanitizedCss,
    });
  });

  test('clears through set so active storage watchers receive the remaining state', () => {
    service.saveImportedCss('light', stylesheet('light.css'));
    service.saveImportedCss('dark', stylesheet('dark.css'));
    const set = vi.spyOn(globalState, 'set');
    const del = vi.spyOn(globalState, 'del');

    service.clearImportedCss('light');

    expect(set).toHaveBeenLastCalledWith('custom-editor-theme-css-v1', {
      version: 1,
      dark: stylesheet('dark.css'),
    });
    expect(del).not.toHaveBeenCalled();
  });

  test('ignores malformed or unsupported persisted versions', () => {
    globalState.set('custom-editor-theme-css-v1', {
      version: 2,
      light: stylesheet('untrusted.css'),
    });

    expect(service.importedThemeCss$.value).toEqual({ version: 1 });
    expect(service.activeImportedCss$.value).toEqual({});
  });

  test('does not replace a valid import after normalization fails', () => {
    service.saveImportedCss('light', stylesheet('valid.css'));

    expect(() =>
      normalizeEditorThemeCss({
        mode: 'light',
        fileName: 'invalid.css',
        css: '.app-sidebar { display: none; }',
        byteLength: 30,
      })
    ).toThrowError(EditorThemeCssImportError);
    expect(service.importedThemeCss$.value.light?.fileName).toBe('valid.css');
  });

  test('keeps runtime state unchanged and wraps persistence failures', () => {
    service.saveImportedCss('light', stylesheet('valid.css'));
    const before = service.importedThemeCss$.value;
    const originalSet = globalState.set.bind(globalState);
    globalState.set = <T>(key: string, value: T) => {
      if (key === 'custom-editor-theme-css-v1') {
        throw new Error('quota exceeded');
      }
      originalSet(key, value);
    };

    expect(() =>
      service.saveImportedCss('light', stylesheet('replacement.css'))
    ).toThrowError(
      expect.objectContaining<Partial<EditorThemeCssImportError>>({
        code: 'persistence-failure',
      })
    );
    expect(service.importedThemeCss$.value).toEqual(before);
  });

  test('does not mutate malformed state while deriving the fallback', () => {
    const malformed = {
      version: 1,
      light: { fileName: 'missing-fields.css' },
    } as unknown as ImportedEditorThemeState;
    globalState.set('custom-editor-theme-css-v1', malformed);

    expect(service.importedThemeCss$.value).toEqual({ version: 1 });
    expect(globalState.get('custom-editor-theme-css-v1')).toBe(malformed);
  });
});
