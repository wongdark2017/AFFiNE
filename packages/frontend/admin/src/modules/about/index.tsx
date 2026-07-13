import { ScrollArea } from '@affine/admin/components/ui/scroll-area';

import { t } from '../../i18n';
import { Header } from '../header';
import { AboutAFFiNE } from './about';

export function ConfigPage() {
  return (
    <div className="h-dvh flex-1 space-y-1 flex-col flex">
      <Header title={t('Server')} />
      <ScrollArea>
        <AboutAFFiNE />
      </ScrollArea>
    </div>
  );
}

export { ConfigPage as Component };
