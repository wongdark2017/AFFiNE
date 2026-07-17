/**
 * @vitest-environment happy-dom
 */
import 'fake-indexeddb/auto';

import { getStoreManager } from '@affine/core/blocksuite/manager/store';
import type { AffineTextAttributes } from '@blocksuite/affine/shared/types';
import { type DeltaInsert, type Store, Text } from '@blocksuite/affine/store';
import { TestWorkspace } from '@blocksuite/affine/store/test';
import { beforeEach, describe, expect, test } from 'vitest';

import { removeDocReferences } from './remove-doc-references';

const LINKED_DOC_ID = 'linked-doc';
const OTHER_DOC_ID = 'other-doc';

const extensions = getStoreManager().config.init().value.get('store');

const referenceText = (pageId: string, insert = ' ') =>
  new Text([
    {
      insert,
      attributes: {
        reference: {
          type: 'LinkedPage',
          pageId,
        },
      },
    },
  ] as DeltaInsert<AffineTextAttributes>[]);

let store: Store;
let noteId: string;

beforeEach(() => {
  const collection = new TestWorkspace({ id: 'test' });
  collection.meta.initialize();
  store = collection.createDoc('page0').getStore({ extensions });
  store.load();
  const pageId = store.addBlock('affine:page', { title: new Text('') });
  noteId = store.addBlock('affine:note', {}, pageId);
});

describe('removeDocReferences', () => {
  test('deletes the paragraph holding only the reference (addLinkedDoc shape)', () => {
    const paragraphId = store.addBlock(
      'affine:paragraph',
      { text: referenceText(LINKED_DOC_ID) },
      noteId
    );

    removeDocReferences(store, LINKED_DOC_ID);

    expect(store.getModelById(paragraphId)).toBeNull();
  });

  test('removes only the inline reference from mixed text', () => {
    const paragraphId = store.addBlock(
      'affine:paragraph',
      {
        text: new Text([
          { insert: 'before ' },
          {
            insert: ' ',
            attributes: {
              reference: { type: 'LinkedPage', pageId: LINKED_DOC_ID },
            },
          },
          { insert: ' after' },
        ] as DeltaInsert<AffineTextAttributes>[]),
      },
      noteId
    );

    removeDocReferences(store, LINKED_DOC_ID);

    const model = store.getModelById(paragraphId);
    expect(model).not.toBeNull();
    expect(model?.text?.toString()).toBe('before  after');
    const deltas = model?.text?.toDelta() as
      | DeltaInsert<AffineTextAttributes>[]
      | undefined;
    expect(deltas?.some(d => d.attributes?.reference)).toBe(false);
  });

  test('keeps references to other docs', () => {
    const paragraphId = store.addBlock(
      'affine:paragraph',
      { text: referenceText(OTHER_DOC_ID) },
      noteId
    );

    removeDocReferences(store, LINKED_DOC_ID);

    const model = store.getModelById(paragraphId);
    expect(model).not.toBeNull();
    const deltas = model?.text?.toDelta() as
      | DeltaInsert<AffineTextAttributes>[]
      | undefined;
    expect(deltas?.[0]?.attributes?.reference?.pageId).toBe(OTHER_DOC_ID);
  });

  test('deletes embed blocks pointing to the doc, keeps others', () => {
    const removedEmbedId = store.addBlock(
      'affine:embed-linked-doc',
      { pageId: LINKED_DOC_ID },
      noteId
    );
    const keptEmbedId = store.addBlock(
      'affine:embed-synced-doc',
      { pageId: OTHER_DOC_ID },
      noteId
    );

    removeDocReferences(store, LINKED_DOC_ID);

    expect(store.getModelById(removedEmbedId)).toBeNull();
    expect(store.getModelById(keptEmbedId)).not.toBeNull();
  });

  test('removes multiple references across blocks in one call', () => {
    const p1 = store.addBlock(
      'affine:paragraph',
      { text: referenceText(LINKED_DOC_ID) },
      noteId
    );
    const p2 = store.addBlock(
      'affine:list',
      {
        text: new Text([
          { insert: 'item ' },
          {
            insert: ' ',
            attributes: {
              reference: { type: 'LinkedPage', pageId: LINKED_DOC_ID },
            },
          },
        ] as DeltaInsert<AffineTextAttributes>[]),
      },
      noteId
    );
    const embed = store.addBlock(
      'affine:embed-linked-doc',
      { pageId: LINKED_DOC_ID },
      noteId
    );

    removeDocReferences(store, LINKED_DOC_ID);

    expect(store.getModelById(p1)).toBeNull();
    expect(store.getModelById(embed)).toBeNull();
    // list blocks are kept even when emptied
    const list = store.getModelById(p2);
    expect(list).not.toBeNull();
    expect(list?.text?.toString()).toBe('item ');
  });
});
