import { LiveData, Service } from '@toeverything/infra';
import { map } from 'rxjs';

import type { GlobalState } from '../../storage';
import { EditorThemeCssImportError } from '../css-import/errors';
import type {
  CssImportReport,
  CustomTheme,
  EditorThemeMode,
  ImportedEditorStylesheet,
  ImportedEditorThemeState,
} from '../types';

const emptyImportedThemeState = (): ImportedEditorThemeState => ({
  version: 1,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isReport = (value: unknown): value is CssImportReport => {
  if (!isRecord(value)) return false;
  return (
    ['affine', 'typora', 'generic'].includes(String(value.sourceKind)) &&
    [
      'appliedRules',
      'translatedRules',
      'ignoredRules',
      'rejectedDeclarations',
    ].every(
      key => typeof value[key] === 'number' && Number.isFinite(value[key])
    ) &&
    Array.isArray(value.warnings) &&
    value.warnings.every(warning => typeof warning === 'string')
  );
};

const isStylesheet = (value: unknown): value is ImportedEditorStylesheet => {
  if (!isRecord(value)) return false;
  return (
    typeof value.fileName === 'string' &&
    typeof value.byteLength === 'number' &&
    Number.isFinite(value.byteLength) &&
    typeof value.importedAt === 'number' &&
    Number.isFinite(value.importedAt) &&
    typeof value.enabled === 'boolean' &&
    typeof value.sanitizedCss === 'string' &&
    value.sanitizedCss.length > 0 &&
    isReport(value.report)
  );
};

const normalizeImportedThemeState = (
  value: unknown
): ImportedEditorThemeState => {
  if (!isRecord(value) || value.version !== 1) {
    return emptyImportedThemeState();
  }
  if (value.light !== undefined && !isStylesheet(value.light)) {
    return emptyImportedThemeState();
  }
  if (value.dark !== undefined && !isStylesheet(value.dark)) {
    return emptyImportedThemeState();
  }
  return value as ImportedEditorThemeState;
};

export class ThemeEditorService extends Service {
  constructor(public readonly globalState: GlobalState) {
    super();
  }

  private readonly _key = 'custom-theme';
  private readonly _importedCssKey = 'custom-editor-theme-css-v1';

  customTheme$ = LiveData.from<CustomTheme | undefined>(
    this.globalState.watch<CustomTheme>(this._key).pipe(
      map(value => {
        if (!value) return { light: {}, dark: {} };
        if (!value.light) value.light = {};
        if (!value.dark) value.dark = {};
        const removeEmpty = (obj: Record<string, string>) =>
          Object.fromEntries(Object.entries(obj).filter(([, v]) => v));
        return {
          light: removeEmpty(value.light),
          dark: removeEmpty(value.dark),
        };
      })
    ),
    { light: {}, dark: {} }
  );

  modified$ = LiveData.computed(get => {
    const theme = get(this.customTheme$);
    const isEmptyObj = (obj: Record<string, string>) =>
      Object.keys(obj).length === 0;
    return theme && !(isEmptyObj(theme.light) && isEmptyObj(theme.dark));
  });

  importedThemeCss$ = LiveData.from<ImportedEditorThemeState>(
    this.globalState
      .watch<unknown>(this._importedCssKey)
      .pipe(map(normalizeImportedThemeState)),
    emptyImportedThemeState()
  );

  activeImportedCss$ = LiveData.computed(get => {
    const state = get(this.importedThemeCss$);
    const active: Partial<Record<EditorThemeMode, string>> = {};
    if (state.light?.enabled) active.light = state.light.sanitizedCss;
    if (state.dark?.enabled) active.dark = state.dark.sanitizedCss;
    return active;
  });

  reset() {
    this.globalState.set(this._key, { light: {}, dark: {} });
  }

  setCustomTheme(theme: CustomTheme) {
    this.globalState.set(this._key, theme);
  }

  updateCustomTheme(mode: 'light' | 'dark', key: string, value?: string) {
    const prev: CustomTheme = this.globalState.get(this._key) ?? {
      light: {},
      dark: {},
    };
    const next = {
      ...prev,
      [mode]: {
        ...prev[mode],
        [key]: value,
      },
    };

    if (!value) {
      delete next[mode][key];
    }

    this.globalState.set(this._key, next);
  }

  saveImportedCss(mode: EditorThemeMode, stylesheet: ImportedEditorStylesheet) {
    const previous = normalizeImportedThemeState(
      this.globalState.get<unknown>(this._importedCssKey)
    );
    this._persistImportedCss({
      ...previous,
      [mode]: stylesheet,
    });
  }

  setImportedCssEnabled(mode: EditorThemeMode, enabled: boolean) {
    const previous = normalizeImportedThemeState(
      this.globalState.get<unknown>(this._importedCssKey)
    );
    const stylesheet = previous[mode];
    if (!stylesheet || stylesheet.enabled === enabled) return;
    this._persistImportedCss({
      ...previous,
      [mode]: {
        ...stylesheet,
        enabled,
      },
    });
  }

  clearImportedCss(mode: EditorThemeMode) {
    const previous = normalizeImportedThemeState(
      this.globalState.get<unknown>(this._importedCssKey)
    );
    if (!previous[mode]) return;
    const next = { ...previous };
    delete next[mode];
    this._persistImportedCss(next);
  }

  private _persistImportedCss(state: ImportedEditorThemeState) {
    try {
      this.globalState.set(this._importedCssKey, state);
    } catch (error) {
      throw new EditorThemeCssImportError(
        'persistence-failure',
        'The imported editor theme could not be saved locally.',
        { cause: error }
      );
    }
  }
}
