export const editorThemeCssImportErrorCodes = [
  'invalid-extension',
  'oversize',
  'unreadable-text',
  'parse-failure',
  'zero-supported-rules',
  'persistence-failure',
] as const;

export type EditorThemeCssImportErrorCode =
  (typeof editorThemeCssImportErrorCodes)[number];

export class EditorThemeCssImportError extends Error {
  constructor(
    public readonly code: EditorThemeCssImportErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'EditorThemeCssImportError';
  }
}
