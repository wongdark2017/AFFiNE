import type { ReactNode } from 'react';

/**
 * Formerly redirected web users into the desktop app / download page.
 * Client download & open-in-app promos are hard-disabled for this build.
 */
export const OpenInAppGuard = ({ children }: { children: ReactNode }) =>
  children;
