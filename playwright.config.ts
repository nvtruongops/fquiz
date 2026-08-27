import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for FQuiz Monorepo
 * Orchestrates Web Student App (:3000) and Standalone Admin App (:3001)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html']] : 'list',
  use: {
    baseURL: process.env.APP_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'npm run start',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
    {
      command: 'npm run start -w apps/admin',
      url: 'http://localhost:3001',
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
  ],
});
