import type { DocFrontendDocState, LocalDocLoadState } from '@affine/nbstore';
import { LiveData, Service } from '@toeverything/infra';
import { tap } from 'rxjs';

import {
  createRootLoadDiagnostics,
  observeWorkspaceRootLoad,
  type WorkspaceRootLoadState,
} from '../utils/root-load-state';
import type { WorkspaceService } from './workspace';

export class WorkspaceRootLoadService extends Service {
  readonly state$ = new LiveData<WorkspaceRootLoadState>({ kind: 'loading' });
  private readonly startedAt = Date.now();
  private local: LocalDocLoadState | null = null;
  private sync: DocFrontendDocState | null = null;

  constructor(private readonly workspaceService: WorkspaceService) {
    super();
    const workspace = workspaceService.workspace;
    const subscription = observeWorkspaceRootLoad({
      flavour: workspace.flavour,
      isSharedMode: workspace.openOptions.isSharedMode,
      local$: workspace.engine.doc.localDocState$(workspace.id).pipe(
        tap(value => {
          this.local = value;
        })
      ),
      sync$: workspace.engine.doc.docState$(workspace.id).pipe(
        tap(value => {
          this.sync = value;
        })
      ),
    }).subscribe(state => this.state$.next(state));
    this.disposables.push(() => subscription.unsubscribe());
  }

  getDiagnostics = () => {
    const workspace = this.workspaceService.workspace;
    return createRootLoadDiagnostics({
      workspaceId: workspace.id,
      flavour: workspace.flavour,
      appVersion: BUILD_CONFIG.appVersion,
      elapsedMs: Date.now() - this.startedAt,
      state: this.state$.value,
      local: this.local,
      sync: this.sync,
    });
  };
}
