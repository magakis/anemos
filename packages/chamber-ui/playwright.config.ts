import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDirectory = path.dirname(fileURLToPath(import.meta.url))

const portFromEnv = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65_536 ? parsed : fallback
}

// ANEMOS-PATCH: use IPv4 loopback because opencode serve binds 127.0.0.1, not ::1.
const backendHost = process.env.PLAYWRIGHT_SERVER_HOST?.trim() || '127.0.0.1'
const backendPort = portFromEnv(process.env.PLAYWRIGHT_SERVER_PORT, 4096)
const chamberPort = portFromEnv(process.env.PLAYWRIGHT_PORT, 4456)
const backendUrl = `http://${backendHost}:${backendPort}`
// ANEMOS-PATCH: make the Vite readiness URL use the same IPv4 loopback family.
const chamberUrl = `http://127.0.0.1:${chamberPort}`

const configuredChromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH?.trim()
const systemChromiumPath = configuredChromiumPath || '/usr/bin/chromium'
const chromiumLaunchOptions = existsSync(systemChromiumPath)
  ? { executablePath: systemChromiumPath, args: ['--no-sandbox'] }
  : undefined

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 30_000,
  },
  reporter: [['html', { outputFolder: './e2e/playwright-report', open: 'never' }], ['line']],
  use: {
    baseURL: `${chamberUrl}/mobile/`,
    browserName: 'chromium',
    ...devices['iPhone 13'],
    viewport: { width: 390, height: 844 },
    isMobile: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // ANEMOS-PATCH: avoid Playwright's separate ffmpeg download; traces/screenshots retain failure diagnostics.
    video: 'off',
    launchOptions: chromiumLaunchOptions,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        launchOptions: chromiumLaunchOptions,
      },
    },
  ],
  webServer: [
    {
      command: `opencode serve --port ${backendPort}`,
      cwd: '/tmp',
      url: `${backendUrl}/global/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    },
    {
      command: `VITE_OPENCODE_SERVER_HOST=${backendHost} VITE_OPENCODE_SERVER_PORT=${backendPort} bun run dev -- --host 0.0.0.0 --port ${chamberPort} --strictPort`,
      cwd: packageDirectory,
      url: `${chamberUrl}/mobile/`,
      reuseExistingServer: false,
      timeout: 120_000,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    },
  ],
})
