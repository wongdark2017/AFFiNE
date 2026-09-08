import { MobileMenu } from '@affine/component';
import { WorkspacesService } from '@affine/core/modules/workspace';
import { track } from '@affine/track';
import { useServiceOptional } from '@toeverything/infra';
import {
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { CurrentWorkspaceCard } from './current-card';
import { SelectorMenu } from './menu';

export const WorkspaceSelector = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { trigger?: ReactElement }
>(function WorkspaceSelector({ className, trigger }, ref) {
  const [open, setOpen] = useState(false);
  const workspaceManager = useServiceOptional(WorkspacesService);

  const openMenu = useCallback(() => {
    track.$.navigationPanel.workspaceList.open();
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
  }, []);

  // revalidate workspace list when open workspace list
  useEffect(() => {
    if (open) workspaceManager?.list.revalidate();
  }, [workspaceManager, open]);

  return (
    <MobileMenu
      items={<SelectorMenu onClose={close} />}
      rootOptions={{
        open,
        onOpenChange: next => (next ? openMenu() : close()),
      }}
      contentOptions={{
        onInteractOutside: close,
        onEscapeKeyDown: close,
        style: { padding: 0 },
      }}
    >
      {trigger ?? <CurrentWorkspaceCard ref={ref} className={className} />}
    </MobileMenu>
  );
});
