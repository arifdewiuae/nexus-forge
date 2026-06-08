import { defineConfig, devices } from '@playwright/test'

/**
 * E2E config. Tests live in e2e/*.e2e.ts so vitest (which only picks up
 * *.test.ts) never runs them. The web server is the *production* build
 * (`node .output/server/index.mjs`) — the dev server isn't used.
 *
 * Local:  builds then serves, and reuses an already-running server.
 * CI:     the workflow runs `pnpm build` first, so the server just boots.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: process.env.CI ? 'node .output/server/index.mjs' : 'pnpm build && node .output/server/index.mjs',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
