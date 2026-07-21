import { LiveData, OnEvent, Service } from '@toeverything/infra';

import type { GlobalState } from '../../storage';
import { WorkbenchLocationChanged } from '../../workbench/services/workbench';
import type { WorkspacesService } from '../../workspace';

const storageKey = 'open-link-mode';

export enum OpenLinkMode {
  ALWAYS_ASK = 'always-ask',
  OPEN_IN_WEB = 'open-in-web',
  OPEN_IN_DESKTOP_APP = 'open-in-desktop-app',
}

/**
 * Open-in-app / download-desktop promos are hard-disabled.
 * Service remains for settings UI compatibility but never prompts.
 */
@OnEvent(WorkbenchLocationChanged, e => e.onNavigation)
export class OpenInAppService extends Service {
  readonly showOpenInAppBanner$ = new LiveData<boolean>(false);
  readonly showOpenInAppPage$ = new LiveData<boolean | undefined>(false);

  constructor(
    public readonly globalState: GlobalState,
    public readonly workspacesService: WorkspacesService
  ) {
    super();
  }

  onNavigation() {
    this.showOpenInAppBanner$.next(false);
  }

  bootstrap() {
    this.showOpenInAppBanner$.next(false);
    this.showOpenInAppPage$.next(false);
  }

  showOpenInAppPage() {
    // no-op: desktop app promo disabled
  }

  hideOpenInAppPage() {
    this.showOpenInAppPage$.next(false);
  }

  getOpenLinkMode() {
    return OpenLinkMode.OPEN_IN_WEB;
  }

  openLinkMode$ = LiveData.from(
    this.globalState.watch<OpenLinkMode>(storageKey),
    OpenLinkMode.OPEN_IN_WEB
  ).map(() => OpenLinkMode.OPEN_IN_WEB);

  setOpenLinkMode(_mode: OpenLinkMode) {
    this.globalState.set(storageKey, OpenLinkMode.OPEN_IN_WEB);
  }

  dismissBanner(_rememberMode: OpenLinkMode | undefined) {
    this.showOpenInAppBanner$.next(false);
  }
}
