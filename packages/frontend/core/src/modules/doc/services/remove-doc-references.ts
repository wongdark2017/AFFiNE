import type { AffineTextAttributes } from '@blocksuite/affine/shared/types';
import type { DeltaInsert, Store } from '@blocksuite/affine/store';

/**
 * Remove all references to `linkedDocId` from the content of `store`:
 * inline `@doc` references and embed-linked/synced-doc blocks. The linked
 * doc itself is not touched.
 */
export function removeDocReferences(store: Store, linkedDocId: string) {
  store.transact(() => {
    for (const model of store.getModelsByFlavour([
      'affine:embed-linked-doc',
      'affine:embed-synced-doc',
    ])) {
      const { pageId } = model.props as { pageId?: string };
      if (pageId === linkedDocId) {
        store.deleteBlock(model);
      }
    }
    for (const model of store.getModelsByFlavour([
      'affine:paragraph',
      'affine:list',
    ])) {
      const text = model.text;
      if (!text) continue;
      const deltas = text.toDelta() as DeltaInsert<AffineTextAttributes>[];
      const ranges: { index: number; length: number }[] = [];
      let index = 0;
      for (const delta of deltas) {
        const length =
          typeof delta.insert === 'string' ? delta.insert.length : 1;
        if (delta.attributes?.reference?.pageId === linkedDocId) {
          ranges.push({ index, length });
        }
        index += length;
      }
      for (const range of ranges.reverse()) {
        text.delete(range.index, range.length);
      }
      // addLinkedDoc creates a paragraph holding only the reference;
      // drop the block entirely once it is emptied by the removal.
      // Text.length is a signal that only updates after the outer
      // transaction commits, so read the underlying Y.Text instead.
      if (
        ranges.length > 0 &&
        text.yText.length === 0 &&
        model.flavour === 'affine:paragraph' &&
        model.children.length === 0
      ) {
        store.deleteBlock(model);
      }
    }
  });
}
