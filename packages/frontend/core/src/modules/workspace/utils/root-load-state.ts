import type { DocFrontendDocState, LocalDocLoadState } from '@affine/nbstore';
import { Observable, Subscription } from 'rxjs';

export const WORKSPACE_ROOT_LOAD_TIMEOUT = 30_000;

export type WorkspaceRootLoadState =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'missing-local-root' }
  | {
      kind: 'load-error';
      code:
        | 'connection_failed'
        | 'read_failed'
        | 'invalid_update'
        | 'sync_failed';
    }
  | { kind: 'stalled' };

interface RootLoadFacts {
  flavour: string;
  isSharedMode?: boolean;
  local: LocalDocLoadState | null;
  sync: DocFrontendDocState | null;
  expired: boolean;
  sourceFailed?: boolean;
}

export function classifyWorkspaceRootLoad(
  facts: RootLoadFacts
): WorkspaceRootLoadState {
  const { local, sync } = facts;
  if (local?.ready) return { kind: 'ready' };
  if (local?.failure) return { kind: 'load-error', code: local.failure.code };
  if (facts.sourceFailed || sync?.syncErrorMessage) {
    return { kind: 'load-error', code: 'sync_failed' };
  }
  if (
    facts.flavour === 'local' &&
    !facts.isSharedMode &&
    local?.loaded &&
    local.initialRead === 'empty' &&
    !local.updating &&
    sync?.initialSyncComplete === true &&
    !sync.syncRetrying
  ) {
    return { kind: 'missing-local-root' };
  }
  return { kind: facts.expired ? 'stalled' : 'loading' };
}

/** One subscription is one opening attempt; timeout never cancels data loading. */
export function observeWorkspaceRootLoad(options: {
  local$: Observable<LocalDocLoadState>;
  sync$: Observable<DocFrontendDocState>;
  flavour: string;
  isSharedMode?: boolean;
  timeoutMs?: number;
}): Observable<WorkspaceRootLoadState> {
  return new Observable(subscriber => {
    const facts: RootLoadFacts = {
      flavour: options.flavour,
      isSharedMode: options.isSharedMode,
      local: null,
      sync: null,
      expired: false,
    };
    const subscriptions = new Subscription();
    let previous: WorkspaceRootLoadState | undefined;
    const publish = () => {
      const next = classifyWorkspaceRootLoad(facts);
      if (next.kind === 'ready') clearTimeout(deadline);
      if (
        previous?.kind === next.kind &&
        (next.kind !== 'load-error' ||
          (previous.kind === 'load-error' && previous.code === next.code))
      )
        return;
      previous = next;
      subscriber.next(next);
    };
    const deadline = setTimeout(() => {
      facts.expired = true;
      publish();
    }, options.timeoutMs ?? WORKSPACE_ROOT_LOAD_TIMEOUT);

    publish();
    subscriptions.add(
      options.local$.subscribe({
        next: local => {
          facts.local = local;
          publish();
        },
        error: () => {
          facts.local = {
            ready: facts.local?.ready ?? false,
            loaded: facts.local?.loaded ?? false,
            updating: false,
            initialRead: 'failed',
            failure: { phase: 'read', code: 'read_failed' },
          };
          publish();
        },
      })
    );
    subscriptions.add(
      options.sync$.subscribe({
        next: sync => {
          facts.sync = sync;
          publish();
        },
        error: () => {
          facts.sourceFailed = true;
          publish();
        },
      })
    );
    return () => {
      clearTimeout(deadline);
      subscriptions.unsubscribe();
    };
  });
}

/** Select fields explicitly: never serialize the workspace or raw error objects. */
export function createRootLoadDiagnostics(input: {
  workspaceId: string;
  flavour: string;
  appVersion: string;
  elapsedMs: number;
  state: WorkspaceRootLoadState;
  local: LocalDocLoadState | null;
  sync: DocFrontendDocState | null;
}) {
  return {
    schemaVersion: 1,
    workspaceId: input.workspaceId,
    flavour: input.flavour,
    appVersion: input.appVersion,
    state: input.state.kind,
    code: input.state.kind === 'load-error' ? input.state.code : undefined,
    initialRead: input.local?.initialRead ?? 'pending',
    initialSyncComplete: input.sync?.initialSyncComplete === true,
    elapsedMs: Math.max(0, Math.round(input.elapsedMs)),
  };
}
