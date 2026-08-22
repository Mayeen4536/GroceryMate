import { defineConfig, devices } from '@playwright/test'
import { resolveConfig } from 'vite'

// Resolve the dev server port from vite.config.ts itself (falling back to
// Vite's own default when the config doesn't set one) so this file never
// hardcodes a port that could silently drift from the real dev server.
const viteConfig = await resolveConfig({ configFile: './vite.config.ts' }, 'serve')
const baseURL = `http://localhost:${viteConfig.server.port}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
