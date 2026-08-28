import { MobileMenuItem, useThemeColorV2, Wrapper } from '@affine/component';
import { EmptyDocs } from '@affine/core/components/affine/empty';
import {
  createDocExplorerContext,
  DocExplorerContext,
} from '@affine/core/components/explorer/context';
import { DocsExplorer } from '@affine/core/components/explorer/docs-view/docs-list';
import { CollectionRulesService } from '@affine/core/modules/collection-rules';
import type { OrderByParams } from '@affine/core/modules/collection-rules/types';
import { useI18n } from '@affine/i18n';
import { SortDownIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useEffect, useState } from 'react';

import { Page } from '../../components/page';
import { AllDocsHeader } from '../../views';

const DEFAULT_ORDER_BY: OrderByParams = {
  type: 'system',
  key: 'updatedAt',
  desc: true,
};

const TITLE_ORDER_BY: OrderByParams = {
  type: 'system',
  key: 'title',
  desc: false,
};

const AllDocs = ({ orderBy }: { orderBy: OrderByParams }) => {
  const [explorerContextValue] = useState(() =>
    createDocExplorerContext({
      quickFavorite: false,
      showDocIcon: false,
      displayProperties: [
        'system:createdAt',
        'system:updatedAt',
        'system:tags',
      ],
      view: 'masonry',
      showDragHandle: false,
      groupBy: undefined,
      orderBy: undefined,
    })
  );
  const collectionRulesService = useService(CollectionRulesService);
  const groups = useLiveData(explorerContextValue.groups$);
  const isEmpty =
    groups.length === 0 ||
    (groups.length && groups.every(group => !group.items.length));

  useEffect(() => {
    const subscription = collectionRulesService
      .watch({
        filters: [
          { type: 'system', key: 'trash', method: 'is', value: 'false' },
        ],
        extraFilters: [
          { type: 'system', key: 'trash', method: 'is', value: 'false' },
          {
            type: 'system',
            key: 'empty-journal',
            method: 'is',
            value: 'false',
          },
        ],
        orderBy,
      })
      .subscribe({
        next: result => {
          explorerContextValue.groups$.next(result.groups);
        },
        error: console.error,
      });
    return () => subscription.unsubscribe();
  }, [collectionRulesService, explorerContextValue.groups$, orderBy]);

  if (isEmpty) {
    return (
      <>
        <EmptyDocs absoluteCenter />
        <Wrapper height={0} flexGrow={1} />
      </>
    );
  }

  return (
    <DocExplorerContext.Provider value={explorerContextValue}>
      <DocsExplorer masonryItemWidthMin={150} />
    </DocExplorerContext.Provider>
  );
};

export const Component = () => {
  const t = useI18n();
  useThemeColorV2('layer/background/mobile/primary');
  const [orderBy, setOrderBy] = useState<OrderByParams>(DEFAULT_ORDER_BY);
  const onSortByName = useCallback(() => {
    setOrderBy(TITLE_ORDER_BY);
  }, []);

  return (
    <Page
      header={
        <AllDocsHeader
          operations={
            <MobileMenuItem
              prefixIcon={<SortDownIcon />}
              onClick={onSortByName}
              data-testid="all-docs-sort-by-name"
            >
              {t['com.affine.explorer.sort-by-name']()}
            </MobileMenuItem>
          }
        />
      }
      tab
    >
      <AllDocs orderBy={orderBy} />
    </Page>
  );
};
