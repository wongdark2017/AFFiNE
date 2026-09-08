import { defineConfig } from '@playwright/test';

import base from './playwright.config';

const servers = base.webServer;
if (!servers) {
  throw new Error('The workspace loading test requires the local web server.');
}

export default defineConfig({
  ...base,
  testMatch: '**/workspace-load-failure.spec.ts',
  grep: /a stale local workspace registration has an actionable error instead of endless loading/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  // Never accidentally validate an older build already listening on port 8080.
  webServer: (Array.isArray(servers) ? servers : [servers]).map(server => ({
    ...server,
    reuseExistingServer: false,
  })),
});
