import { Button } from '@affine/component';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import type { WorkspaceRootLoadState } from '@affine/core/modules/workspace/utils/root-load-state';
import { copyTextToClipboard } from '@affine/core/utils/clipboard';
import { useI18n } from '@affine/i18n';
import {
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import * as styles from './styles.css';

interface WorkspaceLoadFailureProps {
  state: Exclude<WorkspaceRootLoadState, { kind: 'ready' | 'loading' }>;
  getDiagnostics: () => Record<string, unknown>;
  renderWorkspaceSwitcher: (trigger: ReactElement) => ReactNode;
  onReload?: () => void;
}

const reloadPage = () => document.location.reload();

export function WorkspaceLoadFailure({
  state,
  getDiagnostics,
  renderWorkspaceSwitcher,
  onReload = reloadPage,
}: WorkspaceLoadFailureProps) {
  const t = useI18n();
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const [copyState, setCopyState] = useState<
    'idle' | 'pending' | 'copied' | 'failed'
  >('idle');
  useEffect(() => {
    heading.current?.focus();
  }, []);

  const copyDiagnostics = useAsyncCallback(async () => {
    setCopyState('pending');
    try {
      const copied = await copyTextToClipboard(
        JSON.stringify(getDiagnostics(), null, 2)
      );
      setCopyState(copied ? 'copied' : 'failed');
    } catch {
      setCopyState('failed');
    }
  }, [getDiagnostics]);

  const title =
    state.kind === 'missing-local-root'
      ? t['com.affine.workspace-load.missing.title']()
      : state.kind === 'stalled'
        ? t['com.affine.workspace-load.stalled.title']()
        : t['com.affine.workspace-load.error.title']();
  const description =
    state.kind === 'missing-local-root'
      ? t['com.affine.workspace-load.missing.description']()
      : state.kind === 'stalled'
        ? t['com.affine.workspace-load.stalled.description']()
        : t['com.affine.workspace-load.error.description']();

  return (
    <section
      className={styles.container}
      aria-labelledby={headingId}
      data-testid="workspace-load-failure"
      data-state={state.kind}
    >
      <div className={styles.content}>
        <h1 id={headingId} ref={heading} tabIndex={-1} className={styles.title}>
          {title}
        </h1>
        <p className={styles.description}>{description}</p>
        <div className={styles.actions}>
          <Button
            variant="primary"
            onClick={onReload}
            data-testid="workspace-load-reload"
          >
            {t['com.affine.error.reload']()}
          </Button>
          {renderWorkspaceSwitcher(
            <Button data-testid="workspace-load-switch">
              {t['com.affine.workspace-load.switch']()}
            </Button>
          )}
          <Button disabled={copyState === 'pending'} onClick={copyDiagnostics}>
            {t['com.affine.workspace-load.copy']()}
          </Button>
        </div>
        <p role="status" className={styles.copyStatus}>
          {copyState === 'copied'
            ? t['com.affine.workspace-load.copied']()
            : copyState === 'failed'
              ? t['com.affine.workspace-load.copy-failed']()
              : ''}
        </p>
        <details className={styles.recovery}>
          <summary className={styles.recoverySummary}>
            {t['com.affine.workspace-load.recovery.title']()}
          </summary>
          <p>{t['com.affine.workspace-load.recovery.description']()}</p>
        </details>
      </div>
    </section>
  );
}
