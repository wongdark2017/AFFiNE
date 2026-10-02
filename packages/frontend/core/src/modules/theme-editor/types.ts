export type CustomTheme = {
  light: Record<string, string>;
  dark: Record<string, string>;
};

export type EditorThemeMode = 'light' | 'dark';

export type CssImportReport = {
  sourceKind: 'affine' | 'typora' | 'generic';
  appliedRules: number;
  translatedRules: number;
  ignoredRules: number;
  rejectedDeclarations: number;
  warnings: string[];
};

export type ImportedEditorStylesheet = {
  fileName: string;
  byteLength: number;
  importedAt: number;
  enabled: boolean;
  sanitizedCss: string;
  report: CssImportReport;
};

export type ImportedEditorThemeState = {
  version: 1;
  light?: ImportedEditorStylesheet;
  dark?: ImportedEditorStylesheet;
};
