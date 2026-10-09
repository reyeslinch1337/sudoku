import { defineConfig, devices } from '@playwright/test';

// A preinstalled Chromium can be used instead of the one Playwright downloads.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['iPhone 13'],
    browserName: 'chromium',
    baseURL: 'http://localhost:4173/sudoku/',
    launchOptions: { executablePath },
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/sudoku/',
    reuseExistingServer: !process.env.CI,
  },
});
