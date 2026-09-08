import type { DocFrontendDocState, LocalDocLoadState } from '@affine/nbstore';
import { BehaviorSubject, NEVER, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  createRootLoadDiagnostics,
  observeWorkspaceRootLoad,
  type WorkspaceRootLoadState,
} from './root-load-state';

const empty: LocalDocLoadState = {
  ready: false,
  loaded: true,
  updating: false,
  initialRead: 'empty',
};
const checked: DocFrontendDocState = {
  ready: false,
  loaded: true,
  updating: false,
  synced: true,
  syncing: true,
  syncRetrying: false,
  syncErrorMessage: null,
  initialSyncComplete: true,
};
const cleanups: (() => void)[] = [];

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  for (const dispose of cleanups.splice(0)) dispose();
  vi.useRealTimers();
});

function monitor(flavour = 'local', isSharedMode = false) {
  const local$ = new BehaviorSubject<LocalDocLoadState>({
    ...empty,
    loaded: false,
    initialRead: 'pending',
  });
  const sync$ = new BehaviorSubject<DocFrontendDocState>({
    ...checked,
    initialSyncComplete: false,
  });
  const states: WorkspaceRootLoadState[] = [];
  const sub = observeWorkspaceRootLoad({
    local$,
    sync$,
    flavour,
    isSharedMode,
  }).subscribe(v => states.push(v));
  cleanups.push(() => sub.unsubscribe());
  return { local$, sync$, states, sub, latest: () => states.at(-1) };
}

describe('workspace root loading', () => {
  test('requires successful local reading AND conclusive source coverage', () => {
    const m = monitor();
    m.local$.next(empty);
    expect(m.latest()?.kind).toBe('loading');
    m.sync$.next(checked);
    expect(m.latest()?.kind).toBe('missing-local-root');
  });

  test('source-less root completion does not depend on the legacy syncing flag', () => {
    const m = monitor();
    m.local$.next(empty);
    m.sync$.next({ ...checked, syncing: true });
    expect(m.latest()?.kind).toBe('missing-local-root');
  });

  test('does not equate synced with source coverage or accept a missing old-worker field', () => {
    const m = monitor();
    m.local$.next(empty);
    m.sync$.next({ ...checked, initialSyncComplete: undefined });
    expect(m.latest()?.kind).toBe('loading');
    vi.advanceTimersByTime(30_000);
    expect(m.latest()?.kind).toBe('stalled');
  });

  test('does not classify missing while a root update is pending application', () => {
    const m = monitor();
    m.local$.next({ ...empty, updating: true });
    m.sync$.next(checked);
    expect(m.latest()?.kind).toBe('loading');
    m.local$.next({ ...empty, ready: true });
    expect(m.latest()?.kind).toBe('ready');
  });

  test.each(['affine-cloud', 'selfhosted'])(
    'never calls an empty %s cache a missing local workspace',
    flavour => {
      const m = monitor(flavour);
      m.local$.next(empty);
      m.sync$.next(checked);
      vi.advanceTimersByTime(30_000);
      expect(m.latest()?.kind).toBe('stalled');
      m.local$.next({ ...empty, ready: true });
      expect(m.latest()?.kind).toBe('ready');
    }
  );

  test('shared mode does not assert local source absence', () => {
    const m = monitor('local', true);
    m.local$.next(empty);
    m.sync$.next(checked);
    expect(m.latest()?.kind).toBe('loading');
  });

  test('times out even when neither worker stream emits', () => {
    const states: WorkspaceRootLoadState[] = [];
    const sub = observeWorkspaceRootLoad({
      local$: NEVER,
      sync$: NEVER,
      flavour: 'local',
    }).subscribe(v => states.push(v));
    cleanups.push(() => sub.unsubscribe());
    vi.advanceTimersByTime(29_999);
    expect(states.at(-1)?.kind).toBe('loading');
    vi.advanceTimersByTime(1);
    expect(states.at(-1)?.kind).toBe('stalled');
  });

  test('does not extend the deadline on ordinary loading updates', () => {
    const m = monitor();
    for (let i = 0; i < 6; i++) {
      vi.advanceTimersByTime(5_000);
      m.local$.next({ ...empty, loaded: false, initialRead: 'pending' });
    }
    expect(m.latest()?.kind).toBe('stalled');
  });

  test('late valid data replaces a missing result and cancels the deadline', () => {
    const m = monitor();
    m.local$.next(empty);
    m.sync$.next(checked);
    expect(m.latest()?.kind).toBe('missing-local-root');
    m.local$.next({ ...empty, ready: true });
    expect(m.latest()?.kind).toBe('ready');
    expect(vi.getTimerCount()).toBe(0);
  });

  test('readable roots take precedence over offline errors', () => {
    const m = monitor('affine-cloud');
    m.local$.next({ ...empty, ready: true });
    m.sync$.next({
      ...checked,
      syncErrorMessage: 'private endpoint',
      syncRetrying: true,
    });
    expect(m.latest()?.kind).toBe('ready');
  });

  test('source errors do not prove missing data and do not expose raw details', () => {
    const m = monitor();
    m.local$.next(empty);
    m.sync$.next({
      ...checked,
      syncErrorMessage: 'https://secret/?token=private',
    });
    expect(m.latest()).toEqual({ kind: 'load-error', code: 'sync_failed' });
  });

  test('local failures are observable independently of source emissions', () => {
    const local$ = new Subject<LocalDocLoadState>();
    const states: WorkspaceRootLoadState[] = [];
    const sub = observeWorkspaceRootLoad({
      local$,
      sync$: NEVER,
      flavour: 'local',
    }).subscribe(v => states.push(v));
    cleanups.push(() => sub.unsubscribe());
    local$.next({
      ...empty,
      initialRead: 'failed',
      failure: { phase: 'decode', code: 'invalid_update' },
    });
    expect(states.at(-1)).toEqual({
      kind: 'load-error',
      code: 'invalid_update',
    });
  });

  test('disposal cancels timers and prevents a previous workspace from updating the view', () => {
    const first = monitor();
    first.sub.unsubscribe();
    const length = first.states.length;
    const second = monitor('another-server');
    first.local$.next({ ...empty, ready: true });
    vi.advanceTimersByTime(30_000);
    expect(first.states).toHaveLength(length);
    expect(second.latest()?.kind).toBe('stalled');
  });

  test('diagnostics are explicitly selected metadata, not a serialization of errors or the workspace', () => {
    const diagnostics = createRootLoadDiagnostics({
      workspaceId: 'test-id',
      flavour: 'local',
      appVersion: 'test-version',
      elapsedMs: 31_000,
      state: { kind: 'load-error', code: 'sync_failed' },
      local: empty,
      sync: { ...checked, syncErrorMessage: 'private-doc-and-cookie' },
    });
    expect(diagnostics).toMatchObject({
      workspaceId: 'test-id',
      state: 'load-error',
      code: 'sync_failed',
      initialRead: 'empty',
      initialSyncComplete: true,
    });
    expect(JSON.stringify(diagnostics)).not.toContain('private-doc-and-cookie');
  });
});
