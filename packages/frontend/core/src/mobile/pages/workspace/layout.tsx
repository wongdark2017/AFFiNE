import { SafeArea, uniReactRoot } from '@affine/component';
import { AffineErrorBoundary } from '@affine/core/components/affine/affine-error-boundary';
import { AiLoginRequiredModal } from '@affine/core/components/affine/auth/ai-login-required';
import { SWRConfigProvider } from '@affine/core/components/providers/swr-config-provider';
import { WorkspaceSideEffects } from '@affine/core/components/providers/workspace-side-effects';
import { WorkspaceLoadFailure } from '@affine/core/components/workspace-load-failure';
import {
  DefaultServerService,
  WorkspaceServerService,
} from '@affine/core/modules/cloud';
import { GlobalContextService } from '@affine/core/modules/global-context';
import { PeekViewManagerModal } from '@affine/core/modules/peek-view';
import type {
  Workspace,
  WorkspaceMetadata,
} from '@affine/core/modules/workspace';
import {
  WorkspaceRootLoadService,
  WorkspacesService,
} from '@affine/core/modules/workspace';
import { FrameworkScope, useLiveData, useServices } from '@toeverything/infra';
import {
  type PropsWithChildren,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

import { AppFallback } from '../../components/app-fallback';
import { WorkspaceSelector } from '../../components/workspace-selector';
import { WorkspaceDialogs } from '../../dialogs';

// TODO(@forehalo): reuse the global context with [core/electron]
declare global {
  /**
   * @internal debug only
   */
  // oxlint-disable-next-line no-var
  var currentWorkspace: Workspace | undefined;
  // oxlint-disable-next-line no-var
  var exportWorkspaceSnapshot: (docs?: string[]) => Promise<void>;
  // oxlint-disable-next-line no-var
  var importWorkspaceSnapshot: () => Promise<void>;
  interface WindowEventMap {
    'affine:workspace:change': CustomEvent<{ id: string }>;
  }
}

export const WorkspaceLayout = ({
  meta,
  children,
}: PropsWithChildren<{ meta: WorkspaceMetadata }>) => {
  // todo: reduce code duplication with packages\frontend\core\src\pages\workspace\index.tsx
  const { workspacesService, globalContextService, defaultServerService } =
    useServices({
      WorkspacesService,
      GlobalContextService,
      DefaultServerService,
    });

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const workspaceServer = workspace?.scope.get(WorkspaceServerService)?.server;

  useLayoutEffect(() => {
    const ref = workspacesService.open({ metadata: meta });
    setWorkspace(ref.workspace);
    return () => {
      ref.dispose();
    };
  }, [meta, workspacesService]);

  useEffect(() => {
    if (workspace) {
      // for debug purpose
      window.currentWorkspace = workspace ?? undefined;
      window.dispatchEvent(
        new CustomEvent('affine:workspace:change', {
          detail: {
            id: workspace.id,
          },
        })
      );
      localStorage.setItem('last_workspace_id', workspace.id);
      globalContextService.globalContext.workspaceId.set(workspace.id);
      if (workspaceServer) {
        globalContextService.globalContext.serverId.set(workspaceServer.id);
      }
      globalContextService.globalContext.workspaceFlavour.set(
        workspace.flavour
      );
      return () => {
        window.currentWorkspace = undefined;
        globalContextService.globalContext.workspaceId.set(null);
        if (workspaceServer) {
          globalContextService.globalContext.serverId.set(
            defaultServerService.server.id
          );
        }
        globalContextService.globalContext.workspaceFlavour.set(null);
      };
    }
    return;
  }, [
    defaultServerService.server.id,
    globalContextService,
    workspace,
    workspaceServer,
  ]);

  const rootLoad = useMemo(
    () => workspace?.scope.get(WorkspaceRootLoadService),
    [workspace]
  );
  const rootLoadState = useLiveData(rootLoad?.state$);

  if (
    !workspace ||
    !rootLoad ||
    !rootLoadState ||
    workspace.id !== meta.id ||
    workspace.flavour !== meta.flavour
  ) {
    return null; // skip this, workspace will be set in layout effect
  }

  if (rootLoadState.kind === 'loading') {
    return <AppFallback />;
  }

  if (rootLoadState.kind !== 'ready') {
    return (
      <FrameworkScope scope={workspaceServer?.scope}>
        <FrameworkScope scope={workspace.scope}>
          <SafeArea top bottom style={{ height: '100dvh' }}>
            <WorkspaceLoadFailure
              state={rootLoadState}
              getDiagnostics={rootLoad.getDiagnostics}
              renderWorkspaceSwitcher={trigger => (
                <WorkspaceSelector trigger={trigger} />
              )}
            />
          </SafeArea>
        </FrameworkScope>
      </FrameworkScope>
    );
  }

  return (
    <FrameworkScope scope={workspaceServer?.scope}>
      <FrameworkScope scope={workspace.scope}>
        <AffineErrorBoundary height="100dvh">
          <SWRConfigProvider>
            <WorkspaceDialogs />

            {/* ---- some side-effect components ---- */}
            <PeekViewManagerModal />
            <AiLoginRequiredModal />
            <uniReactRoot.Root />
            <WorkspaceSideEffects />
            {children}
          </SWRConfigProvider>
        </AffineErrorBoundary>
      </FrameworkScope>
    </FrameworkScope>
  );
};
