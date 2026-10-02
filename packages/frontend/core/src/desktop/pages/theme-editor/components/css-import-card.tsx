import { Button, notify, Switch, useConfirmModal } from '@affine/component';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { ThemeEditorService } from '@affine/core/modules/theme-editor';
import { MAX_EDITOR_THEME_CSS_BYTES } from '@affine/core/modules/theme-editor/css-import/constants';
import { EditorThemeCssImportError } from '@affine/core/modules/theme-editor/css-import/errors';
import type {
  EditorThemeMode,
  ImportedEditorStylesheet,
} from '@affine/core/modules/theme-editor/types';
import { useI18n } from '@affine/i18n';
import { useService } from '@toeverything/infra';
import bytes from 'bytes';
import { type ChangeEvent, useCallback, useRef, useState } from 'react';

import * as styles from './css-import.css';

const readCssFile = async (file: File, mode: EditorThemeMode) => {
  if (!/\.css$/i.test(file.name)) {
    throw new EditorThemeCssImportError(
      'invalid-extension',
      'Editor themes must use a .css file.'
    );
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (error) {
    throw new EditorThemeCssImportError(
      'unreadable-text',
      'The CSS file could not be read.',
      { cause: error }
    );
  }

  if (buffer.byteLength > MAX_EDITOR_THEME_CSS_BYTES) {
    throw new EditorThemeCssImportError(
      'oversize',
      `Editor theme CSS must not exceed ${MAX_EDITOR_THEME_CSS_BYTES} bytes.`
    );
  }

  let css: string;
  try {
    css = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch (error) {
    throw new EditorThemeCssImportError(
      'unreadable-text',
      'The CSS file must contain valid UTF-8 text.',
      { cause: error }
    );
  }

  const { normalizeEditorThemeCss } =
    await import('@affine/core/modules/theme-editor/css-import/normalize');
  return {
    ...normalizeEditorThemeCss({
      mode,
      fileName: file.name,
      css,
      byteLength: buffer.byteLength,
    }),
    byteLength: buffer.byteLength,
  };
};

export const CssImportCard = ({
  mode,
  stylesheet,
}: {
  mode: EditorThemeMode;
  stylesheet?: ImportedEditorStylesheet;
}) => {
  const t = useI18n();
  const themeEditorService = useService(ThemeEditorService);
  const { openConfirmModal } = useConfirmModal();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const title =
    mode === 'light'
      ? t['com.affine.themeEditor.importedCss.light.title']()
      : t['com.affine.themeEditor.importedCss.dark.title']();
  const testIdPrefix = `theme-editor-${mode}-css`;

  const getErrorMessage = useCallback(
    (error: unknown) => {
      if (!(error instanceof EditorThemeCssImportError)) {
        return t['com.affine.themeEditor.importedCss.error.unknown']();
      }
      switch (error.code) {
        case 'invalid-extension':
          return t[
            'com.affine.themeEditor.importedCss.error.invalidExtension'
          ]();
        case 'oversize':
          return t['com.affine.themeEditor.importedCss.error.oversize']();
        case 'unreadable-text':
          return t['com.affine.themeEditor.importedCss.error.unreadable']();
        case 'parse-failure':
          return t['com.affine.themeEditor.importedCss.error.parse']();
        case 'zero-supported-rules':
          return t[
            'com.affine.themeEditor.importedCss.error.noSupportedRules'
          ]();
        case 'persistence-failure':
          return t['com.affine.themeEditor.importedCss.error.persistence']();
      }
    },
    [t]
  );

  const showError = useCallback(
    (error: unknown) => {
      console.error(error);
      notify.error({
        title: t['com.affine.themeEditor.importedCss.import.error.title'](),
        message: getErrorMessage(error),
      });
    },
    [getErrorMessage, t]
  );

  const importFile = useAsyncCallback(
    async (file: File) => {
      setIsImporting(true);
      try {
        const normalized = await readCssFile(file, mode);
        themeEditorService.saveImportedCss(mode, {
          fileName: file.name,
          byteLength: normalized.byteLength,
          importedAt: Date.now(),
          enabled: true,
          sanitizedCss: normalized.sanitizedCss,
          report: normalized.report,
        });
        notify.success({
          title: t['com.affine.themeEditor.importedCss.import.success.title'](),
          message:
            t[
              'com.affine.themeEditor.importedCss.import.success.description'
            ](),
        });
      } catch (error) {
        showError(error);
      } finally {
        setIsImporting(false);
      }
    },
    [mode, showError, t, themeEditorService]
  );

  const onFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = '';
      if (file) void importFile(file);
    },
    [importFile]
  );

  const onToggleEnabled = useCallback(
    (enabled: boolean) => {
      try {
        themeEditorService.setImportedCssEnabled(mode, enabled);
      } catch (error) {
        showError(error);
      }
    },
    [mode, showError, themeEditorService]
  );

  const onClear = useCallback(() => {
    openConfirmModal({
      title: t['com.affine.themeEditor.importedCss.clear.confirm.title'](),
      description:
        t['com.affine.themeEditor.importedCss.clear.confirm.description'](),
      confirmText: t['com.affine.themeEditor.importedCss.clear'](),
      cancelText: t['Cancel'](),
      confirmButtonOptions: { variant: 'error' },
      onConfirm: () => {
        try {
          themeEditorService.clearImportedCss(mode);
        } catch (error) {
          showError(error);
        }
      },
    });
  }, [mode, openConfirmModal, showError, t, themeEditorService]);

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{title}</h2>
        <div className={styles.switchLabel}>
          <span>{t['com.affine.themeEditor.importedCss.enabled']()}</span>
          <Switch
            data-testid={`${testIdPrefix}-enable`}
            checked={stylesheet?.enabled ?? false}
            disabled={!stylesheet}
            onChange={onToggleEnabled}
          />
        </div>
      </div>

      {stylesheet ? (
        <div className={styles.fileInfo}>
          <div className={styles.fileName} title={stylesheet.fileName}>
            {stylesheet.fileName}
          </div>
          <div className={styles.fileMetadata}>
            {bytes(stylesheet.byteLength)} ·{' '}
            {new Date(stylesheet.importedAt).toLocaleString()}
          </div>
        </div>
      ) : (
        <div className={styles.emptyFile}>
          {t['com.affine.themeEditor.importedCss.empty']()}
        </div>
      )}

      <div className={styles.actions}>
        <input
          ref={fileInputRef}
          className={styles.hiddenInput}
          data-testid={`${testIdPrefix}-input`}
          type="file"
          accept=".css,text/css"
          onChange={onFileChange}
        />
        <Button
          variant="primary"
          loading={isImporting}
          disabled={isImporting}
          onClick={() => fileInputRef.current?.click()}
        >
          {stylesheet
            ? t['com.affine.themeEditor.importedCss.replace']()
            : t['com.affine.themeEditor.importedCss.import']()}
        </Button>
        <Button
          data-testid={`${testIdPrefix}-clear`}
          variant="error"
          disabled={!stylesheet}
          onClick={onClear}
        >
          {t['com.affine.themeEditor.importedCss.clear']()}
        </Button>
      </div>

      <div className={styles.report} data-testid={`${testIdPrefix}-report`}>
        <div className={styles.reportTitle}>
          {t['com.affine.themeEditor.importedCss.report.title']()}
        </div>
        {stylesheet ? (
          <>
            <div className={styles.reportGrid}>
              <div className={styles.reportItem}>
                <span>
                  {t['com.affine.themeEditor.importedCss.report.applied']()}
                </span>
                <span className={styles.reportValue}>
                  {stylesheet.report.appliedRules}
                </span>
              </div>
              <div className={styles.reportItem}>
                <span>
                  {t['com.affine.themeEditor.importedCss.report.translated']()}
                </span>
                <span className={styles.reportValue}>
                  {stylesheet.report.translatedRules}
                </span>
              </div>
              <div className={styles.reportItem}>
                <span>
                  {t['com.affine.themeEditor.importedCss.report.ignored']()}
                </span>
                <span className={styles.reportValue}>
                  {stylesheet.report.ignoredRules}
                </span>
              </div>
              <div className={styles.reportItem}>
                <span>
                  {t['com.affine.themeEditor.importedCss.report.rejected']()}
                </span>
                <span className={styles.reportValue}>
                  {stylesheet.report.rejectedDeclarations}
                </span>
              </div>
            </div>
            {stylesheet.report.warnings.length ? (
              <details className={styles.warningDetails}>
                <summary className={styles.warningSummary}>
                  {t['com.affine.themeEditor.importedCss.report.warnings']()} (
                  {stylesheet.report.warnings.length})
                </summary>
                <ul className={styles.warningList}>
                  {stylesheet.report.warnings.map(warning => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        ) : (
          <div className={styles.fileMetadata}>
            {t['com.affine.themeEditor.importedCss.report.empty']()}
          </div>
        )}
      </div>
    </section>
  );
};
