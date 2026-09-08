import 'fake-indexeddb/auto';

import { openDB } from 'idb';
import { NEVER } from 'rxjs';
import { afterEach, expect, test, vi } from 'vitest';
import { Doc as YDoc, encodeStateAsUpdate } from 'yjs';

import { DocFrontend, type LocalDocLoadState } from '../frontend/doc';
import {
  IndexedDBBlobStorage,
  IndexedDBDocStorage,
  IndexedDBDocSyncStorage,
} from '../impls/idb';
import { IndexedDBV1DocStorage } from '../impls/idb/v1';
import type { DocClocks } from '../storage';
import { DocSyncImpl } from '../sync/doc';
import { DocSyncPeer } from '../sync/doc/peer';

let sequence = 0;
const cleanup: (() => void | Promise<void>)[] = [];

afterEach(async () => {
  for (const dispose of cleanup.splice(0).reverse()) await dispose();
  vi.restoreAllMocks();
});

async function storage(readonlyMode = false) {
  const options = {
    id: `root-load-${sequence++}`,
    flavour: 'local',
    type: 'workspace' as const,
    readonlyMode,
  };
  const doc = new IndexedDBDocStorage(options);
  doc.connection.connect();
  await doc.connection.waitForConnected();
  cleanup.push(() => doc.connection.disconnect());
  return { doc, options };
}

function observeLocal(frontend: DocFrontend) {
  let latest: LocalDocLoadState | undefined;
  const sub = frontend.localDocState$('root').subscribe(value => {
    latest = value;
  });
  cleanup.push(() => sub.unsubscribe());
  return () => latest;
}

function startFrontend(doc: IndexedDBDocStorage, sync = DocSyncImpl.dummy) {
  const frontend = new DocFrontend(doc, sync);
  const root = new YDoc({ guid: 'root' });
  cleanup.push(() => root.destroy());
  frontend.connectDoc(root);
  frontend.start();
  cleanup.push(async () => {
    frontend.stop();
    await new Promise<void>(resolve => setImmediate(resolve));
  });
  return { frontend, root };
}

test('empty root finishes its local read without fabricating ready or writing data', async () => {
  const { doc, options } = await storage();
  const blobs = new IndexedDBBlobStorage(options);
  blobs.connection.connect();
  await blobs.connection.waitForConnected();
  cleanup.push(() => blobs.connection.disconnect());
  const attachment = new Uint8Array([1, 3, 5, 7]);
  await blobs.set({
    key: 'keep-attachment',
    data: attachment,
    mime: 'application/octet-stream',
  });
  const other = new YDoc();
  other.getMap('meta').set('name', 'keep this document');
  const otherData = encodeStateAsUpdate(other);
  await doc.pushDocUpdate({ docId: 'other', bin: otherData });
  other.destroy();
  const push = vi.spyOn(doc, 'pushDocUpdate');
  const { frontend } = startFrontend(doc);
  const state = observeLocal(frontend);

  await vi.waitFor(() =>
    expect(state()).toMatchObject({
      loaded: true,
      ready: false,
      initialRead: 'empty',
      updating: false,
    })
  );
  expect(push).not.toHaveBeenCalled();
  expect(await doc.getDoc('root')).toBeNull();
  expect((await doc.getDoc('other'))?.bin).toEqual(otherData);
  expect((await blobs.get('keep-attachment'))?.data).toEqual(attachment);
  expect(await blobs.list()).toHaveLength(1);
});

test('local read state is available even when the worker sync stream never responds', async () => {
  const { doc } = await storage();
  const sync = DocSyncImpl.dummy;
  vi.spyOn(sync, 'docState$').mockReturnValue(NEVER);
  const frontend = new DocFrontend(doc, sync);
  const root = new YDoc({ guid: 'root' });
  cleanup.push(() => root.destroy());
  frontend.connectDoc(root);
  frontend.start();
  cleanup.push(async () => {
    frontend.stop();
    await new Promise<void>(resolve => setImmediate(resolve));
  });
  const state = observeLocal(frontend);
  await vi.waitFor(() => expect(state()?.initialRead).toBe('empty'));
});

test('a valid root with an empty page list is ready, including when persisted only as an update', async () => {
  const { doc } = await storage();
  const source = new YDoc();
  source.getMap('meta').set('name', 'Empty workspace');
  await doc.pushDocUpdate({ docId: 'root', bin: encodeStateAsUpdate(source) });
  source.destroy();
  const { frontend, root } = startFrontend(doc);
  const state = observeLocal(frontend);
  await vi.waitFor(() =>
    expect(state()).toMatchObject({ initialRead: 'nonempty', ready: true })
  );
  expect(root.getMap('meta').get('name')).toBe('Empty workspace');
});

test('a late root update becomes ready after an empty initial read', async () => {
  const { doc } = await storage();
  const { frontend } = startFrontend(doc);
  const state = observeLocal(frontend);
  await vi.waitFor(() => expect(state()?.initialRead).toBe('empty'));
  const source = new YDoc();
  source.getMap('meta').set('name', 'Recovered');
  await doc.pushDocUpdate({ docId: 'root', bin: encodeStateAsUpdate(source) });
  source.destroy();
  await vi.waitFor(() => expect(state()?.ready).toBe(true));
});

test('read failure exposes a stable code without the original private error', async () => {
  const { doc } = await storage();
  vi.spyOn(doc, 'getDoc').mockRejectedValue(
    new Error('private document token=secret')
  );
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const { frontend } = startFrontend(doc);
  const state = observeLocal(frontend);
  await vi.waitFor(() =>
    expect(state()).toMatchObject({
      ready: false,
      initialRead: 'failed',
      failure: { phase: 'read', code: 'read_failed' },
    })
  );
  expect(JSON.stringify(state())).not.toContain('secret');
});

test('invalid Yjs data does not become ready just because a record was returned', async () => {
  const { doc } = await storage();
  vi.spyOn(doc, 'getDoc').mockResolvedValue({
    docId: 'root',
    bin: new Uint8Array([255]),
    timestamp: new Date(),
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const { frontend } = startFrontend(doc);
  const state = observeLocal(frontend);
  await vi.waitFor(() =>
    expect(state()).toMatchObject({
      ready: false,
      failure: { phase: 'decode', code: 'invalid_update' },
    })
  );
});

test('source absence is conclusive only after enumeration, even without a root connect job', async () => {
  const local = await storage();
  const remote = await storage(true);
  const metadata = new IndexedDBDocSyncStorage(local.options);
  metadata.connection.connect();
  await metadata.connection.waitForConnected();
  cleanup.push(() => metadata.connection.disconnect());
  const clocks = Promise.withResolvers<DocClocks>();
  const enumerate = vi
    .spyOn(remote.doc, 'getDocTimestamps')
    .mockReturnValue(clocks.promise);
  const peer = new DocSyncPeer('v1', local.doc, metadata, remote.doc);
  const abort = new AbortController();
  const states: { initialSyncComplete?: boolean; synced: boolean }[] = [];
  const sub = peer.docState$('root').subscribe(value => states.push(value));
  const loop = peer.mainLoop(abort.signal);
  cleanup.push(async () => {
    clocks.resolve({});
    abort.abort();
    await loop;
    sub.unsubscribe();
  });

  await vi.waitFor(() => expect(enumerate).toHaveBeenCalled());
  expect(states.at(-1)?.synced).toBe(true);
  expect(states.at(-1)?.initialSyncComplete).toBe(false);
  clocks.resolve({});
  await vi.waitFor(() => expect(states.at(-1)?.initialSyncComplete).toBe(true));
  expect(await local.doc.getDoc('root')).toBeNull();
});

test('source completion waits for a discovered root to finish pulling', async () => {
  const local = await storage();
  const remote = await storage();
  const root = new YDoc();
  root.getMap('meta').set('name', 'Legacy root');
  await remote.doc.pushDocUpdate({
    docId: 'root',
    bin: encodeStateAsUpdate(root),
  });
  root.destroy();
  const diff = await remote.doc.getDocDiff('root');
  const pull = Promise.withResolvers<typeof diff>();
  const getDiff = vi
    .spyOn(remote.doc, 'getDocDiff')
    .mockReturnValue(pull.promise);
  const metadata = new IndexedDBDocSyncStorage(local.options);
  metadata.connection.connect();
  await metadata.connection.waitForConnected();
  cleanup.push(() => metadata.connection.disconnect());
  const peer = new DocSyncPeer('v1', local.doc, metadata, remote.doc);
  let complete: boolean | undefined;
  const sub = peer.docState$('root').subscribe(value => {
    complete = value.initialSyncComplete;
  });
  const abort = new AbortController();
  const loop = peer.mainLoop(abort.signal);
  cleanup.push(async () => {
    pull.resolve(diff);
    abort.abort();
    await loop;
    sub.unsubscribe();
  });
  await vi.waitFor(() => expect(getDiff).toHaveBeenCalled());
  expect(complete).toBe(false);
  pull.resolve(diff);
  await vi.waitFor(() => expect(complete).toBe(true));
  expect(await local.doc.getDoc('root')).not.toBeNull();
});

test('real v1 data keeps the missing root pending until migration applies it', async () => {
  const local = await storage();
  const id = local.options.id;
  const oldDb = await openDB('affine-local', 1, {
    upgrade(db) {
      db.createObjectStore('workspace', { keyPath: 'id' });
    },
  });
  cleanup.push(() => oldDb.close());
  const root = new YDoc({ guid: id });
  root.getMap('meta').set('name', 'Legacy workspace');
  await oldDb.put('workspace', {
    id,
    updates: [{ timestamp: Date.now(), update: encodeStateAsUpdate(root) }],
  });
  root.destroy();

  const legacy = new IndexedDBV1DocStorage(local.options);
  const metadata = new IndexedDBDocSyncStorage(local.options);
  legacy.connection.connect();
  metadata.connection.connect();
  await Promise.all([
    legacy.connection.waitForConnected(),
    metadata.connection.waitForConnected(),
  ]);
  cleanup.push(() => legacy.connection.disconnect());
  cleanup.push(() => metadata.connection.disconnect());
  const gate = Promise.withResolvers<void>();
  const enumerate = legacy.getDocTimestamps.bind(legacy);
  vi.spyOn(legacy, 'getDocTimestamps').mockImplementation(async () => {
    await gate.promise;
    return enumerate();
  });
  const sync = new DocSyncImpl(
    { local: local.doc, remotes: { v1: legacy } },
    metadata
  );
  const frontend = new DocFrontend(local.doc, sync);
  const target = new YDoc({ guid: id });
  frontend.connectDoc(target);
  let state: LocalDocLoadState | undefined;
  let complete: boolean | undefined;
  const a = frontend.localDocState$(id).subscribe(v => {
    state = v;
  });
  const b = sync.docState$(id).subscribe(v => {
    complete = v.initialSyncComplete;
  });
  sync.start();
  frontend.start();
  cleanup.push(async () => {
    gate.resolve();
    frontend.stop();
    sync.stop();
    a.unsubscribe();
    b.unsubscribe();
    target.destroy();
    await new Promise<void>(resolve => setImmediate(resolve));
  });
  await vi.waitFor(() => expect(state?.initialRead).toBe('empty'));
  expect(complete).toBe(false);
  gate.resolve();
  await vi.waitFor(() => expect(state?.ready).toBe(true));
  expect(target.getMap('meta').get('name')).toBe('Legacy workspace');
});

test('readonly skipped sync is not proof that a source has been checked', async () => {
  const local = await storage(true);
  const remote = await storage();
  const metadata = new IndexedDBDocSyncStorage(remote.options);
  metadata.connection.connect();
  await metadata.connection.waitForConnected();
  cleanup.push(() => metadata.connection.disconnect());
  const peer = new DocSyncPeer('readonly', local.doc, metadata, remote.doc);
  let state: { synced: boolean; initialSyncComplete: boolean } | undefined;
  const sub = peer.docState$('root').subscribe(value => {
    state = value;
  });
  const abort = new AbortController();
  const loop = peer.mainLoop(abort.signal);
  cleanup.push(async () => {
    abort.abort();
    await loop;
    sub.unsubscribe();
  });
  expect(state).toMatchObject({ synced: true, initialSyncComplete: false });
});

test('connection failure has a stable failure code rather than masquerading as an empty root', async () => {
  const { doc } = await storage();
  vi.spyOn(doc.connection, 'waitForConnected').mockRejectedValue(
    new Error('private connection information')
  );
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const { frontend } = startFrontend(doc);
  const state = observeLocal(frontend);
  await vi.waitFor(() =>
    expect(state()).toMatchObject({
      initialRead: 'failed',
      failure: { phase: 'connect', code: 'connection_failed' },
    })
  );
});

test('valid data arriving after a decode error can still make the root ready', async () => {
  const { doc } = await storage();
  vi.spyOn(doc, 'getDoc').mockResolvedValueOnce({
    docId: 'root',
    bin: new Uint8Array([255]),
    timestamp: new Date(),
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const { frontend } = startFrontend(doc);
  const state = observeLocal(frontend);
  await vi.waitFor(() => expect(state()?.failure?.code).toBe('invalid_update'));
  const root = new YDoc();
  root.getMap('meta').set('name', 'Valid replacement');
  await doc.pushDocUpdate({ docId: 'root', bin: encodeStateAsUpdate(root) });
  root.destroy();
  await vi.waitFor(() =>
    expect(state()).toMatchObject({ ready: true, failure: undefined })
  );
});
