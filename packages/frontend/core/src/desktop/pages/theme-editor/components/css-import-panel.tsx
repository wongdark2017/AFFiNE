import { ThemeEditorService } from '@affine/core/modules/theme-editor';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';

import * as styles from './css-import.css';
import { CssImportCard } from './css-import-card';

export const CssImportPanel = () => {
  const t = useI18n();
  const themeEditorService = useService(ThemeEditorService);
  const importedThemeCss = useLiveData(themeEditorService.importedThemeCss$);

  return (
    <main className={styles.panel}>
      <div className={styles.panelContent}>
        <header className={styles.panelHeader}>
          <h1 className={styles.panelTitle}>
            {t['com.affine.themeEditor.importedCss.title']()}
          </h1>
          <p className={styles.panelDescription}>
            {t['com.affine.themeEditor.importedCss.description']()}
          </p>
        </header>
        <div className={styles.cards}>
          <CssImportCard mode="light" stylesheet={importedThemeCss.light} />
          <CssImportCard mode="dark" stylesheet={importedThemeCss.dark} />
        </div>
      </div>
    </main>
  );
};
