import { defineConfig, devices } from '@playwright/test';

// The frontend hardcodes its API base URL to localhost:3000 (see
// core/config/api.config.ts), so the backend must run there. The
// frontend port is moved off the conventional 4200 only because that
// port is prone to collisions with unrelated dev servers on a shared
// machine; E2E always boots its own fresh server pair rather than
// reusing whatever else might already be listening.
const FRONTEND_PORT = 4210;
const BACKEND_PORT = 3000;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../backend',
      port: BACKEND_PORT,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npm run start -- --port ${FRONTEND_PORT}`,
      cwd: '../frontend',
      port: FRONTEND_PORT,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
