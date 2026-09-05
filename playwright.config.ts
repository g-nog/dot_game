import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4174',
    port: 4174,
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: 'http://127.0.0.1:4174', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'], viewport: { width: 360, height: 640 } },
    },
    {
      name: 'webkit-mobile',
      use: {
        ...devices['iPhone 13'],
        launchOptions: process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE_PATH
          ? { executablePath: process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE_PATH }
          : undefined,
      },
    },
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
