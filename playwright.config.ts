import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1100 },
        launchOptions: {
          executablePath:
            process.env.CHROMIUM_PATH ||
            (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
          args: ['--no-sandbox'],
        },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        defaultBrowserType: 'chromium',
        launchOptions: {
          executablePath:
            process.env.CHROMIUM_PATH ||
            (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
          args: ['--no-sandbox'],
        },
      },
    },
    {
      name: 'macbook-safari',
      // The native Windows executable handoff belongs to the Chrome project.
      testIgnore: '**/desktop-download.spec.ts',
      // Multi-window image import/export flows take longer in WebKit.
      timeout: 60_000,
      use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
});
