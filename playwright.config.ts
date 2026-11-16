import { defineConfig } from '@playwright/test';
import { browserOptions } from './scripts/browser.mjs';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  // Surface actionable assertions in Checks even when signed artifact/log
  // downloads are unavailable; retain the HTML/traces for normal inspection.
  reporter: process.env.GITHUB_ACTIONS
    ? [['list'], ['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: browserOptions,
  },
});
