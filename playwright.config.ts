import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

const PREVIEW_PORT = process.env.PREVIEW_PORT ?? '3456'
const baseUrl = `http://localhost:${PREVIEW_PORT}`

export default defineConfig({
  testDir: path.join(import.meta.dirname, 'e2e'),
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tmp/playwright-report' }]],
  timeout: 60_000,
  use: {
    baseURL: baseUrl,
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun tools/preview/server.ts',
    url: `${baseUrl}/`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: { ...process.env, PORT: PREVIEW_PORT }
  }
})
