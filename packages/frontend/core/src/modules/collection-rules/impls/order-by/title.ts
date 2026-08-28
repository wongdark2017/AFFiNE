import type { DocsService } from '@affine/core/modules/doc';
import type { I18nService } from '@affine/core/modules/i18n';
import { Service } from '@toeverything/infra';
import { map, type Observable } from 'rxjs';

import type { OrderByProvider } from '../../provider';
import type { OrderByParams } from '../../types';
import { compareDocTitles } from './compare-doc-titles';

export class TitleOrderByProvider extends Service implements OrderByProvider {
  constructor(
    private readonly docsService: DocsService,
    private readonly i18nService: I18nService
  ) {
    super();
  }
  orderBy$(
    _items$: Observable<Set<string>>,
    params: OrderByParams
  ): Observable<string[]> {
    const untitled = this.i18nService.i18n.i18next.t('Untitled');
    return this.docsService.allDocTitle$().pipe(
      map(docs => {
        return [...docs]
          .sort((a, b) =>
            compareDocTitles(a.title, b.title, untitled, params.desc)
          )
          .map(doc => doc.id);
      })
    );
  }
}
