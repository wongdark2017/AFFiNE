import { CollectionService } from '@affine/core/modules/collection';
import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import { TagService } from '@affine/core/modules/tag';
import { useI18n } from '@affine/i18n';
import { useServices } from '@toeverything/infra';
import { useCallback } from 'react';

import type { FolderNode } from '../entities/folder-node';
import { sortIdsByDisplayName } from '../utils/sort-folder-children';

export function useSortFolderChildrenByName(node: FolderNode | null) {
  const t = useI18n();
  const { docDisplayMetaService, tagService, collectionService } = useServices({
    DocDisplayMetaService,
    TagService,
    CollectionService,
  });
  const untitled = t['Untitled']();

  return useCallback(() => {
    if (!node) {
      return;
    }
    const items = node.sortedChildren$.value.flatMap(child => {
      if (!child.id) {
        return [];
      }
      const type = child.type$.value;
      const data = child.data$.value;
      let name = '';
      if (type === 'folder') {
        name = child.name$.value;
      } else if (type === 'doc' && data) {
        name = docDisplayMetaService.title$(data).value;
      } else if (type === 'tag' && data) {
        name =
          tagService.tagList.tagByTagId$(data).value?.value$.value ?? untitled;
      } else if (type === 'collection' && data) {
        name = collectionService.collection$(data).value?.name$.value ?? '';
      }
      if (!name) {
        name = untitled;
      }
      return [{ id: child.id, name }];
    });
    node.reorderChildren(sortIdsByDisplayName(items));
  }, [collectionService, docDisplayMetaService, node, tagService, untitled]);
}
