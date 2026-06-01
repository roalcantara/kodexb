import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'

const PREVIEW_PORT = process.env.PREVIEW_PORT ?? '3456'
const baseUrl = `http://localhost:${PREVIEW_PORT}`

const TEST_TIMEOUT_MS = 60_000
const CI_TEST_TIMEOUT_MS = 180_000

const bddTestDir = defineBddConfig({
  features: 'assets/features/e2e/**/*.feature',
  steps: ['e2e/support/fixtures.support.ts', 'e2e/steps/**/*.ts'],
  outputDir: 'e2e/.generated',
  tags: 'not @todo',
  disableWarnings: { importTestFrom: true }
})

export default defineConfig({
  testDir: bddTestDir,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  globalTeardown: path.join(import.meta.dirname, 'e2e/support/global_teardown.support.ts'),
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'tmp/playwright-report' }],
    ['junit', { outputFile: 'tmp/e2e/junit.xml' }]
  ],
  outputDir: 'tmp/e2e/test-results',
  timeout: process.env.CI ? CI_TEST_TIMEOUT_MS : TEST_TIMEOUT_MS,
  use: {
    baseURL: baseUrl,
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write']
        }
      }
    }
  ],
  webServer: {
    command: 'bun e2e/support/preview_with_fixture.support.ts',
    url: `${baseUrl}/`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: PREVIEW_PORT,
      PREVIEW_PORT
    }
  }
})
