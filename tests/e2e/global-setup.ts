/**
 * E2E Global Setup
 *
 * Global setup for Playwright E2E tests.
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test suite...');

  // Set up test environment
  process.env.NODE_ENV = 'test';
  process.env.E2E_TEST = 'true';

  // Create browser instance for shared use
  const browser = await chromium.launch({
    headless: true,
  });

  // Store browser instance for tests
  process.env.E2E_BROWSER_WS_ENDPOINT = browser.wsEndpoint();

  console.log('✅ E2E test environment ready');

  return async () => {
    // Teardown
    await browser.close();
    console.log('🏁 E2E test suite completed');
  };
}

export default globalSetup;
