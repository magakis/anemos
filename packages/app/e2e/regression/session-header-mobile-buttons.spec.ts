import { expect, test, type Locator, type Page } from "@playwright/test"
import { base64Encode } from "@opencode-ai/core/util/encode"
import { mockOpenCodeServer } from "../utils/mock-server"
import { expectSessionTitle } from "../utils/waits"

const viewport = { width: 375, height: 812 }

test.use({ viewport })

const directory = "C:/OpenCode/SessionHeaderMobileButtons"
const projectID = "proj_session_header_mobile_buttons"
const sessionID = "ses_session_header_mobile_buttons"
const title = "Session header mobile buttons"

test("keeps mobile refresh and status on one row inside the viewport (v1 layout)", async ({ page }) => {
  await mockSessionServer(page)
  await page.addInitScript(() => {
    localStorage.setItem(
      "settings.v3",
      JSON.stringify({ general: { newLayoutDesigns: false, shouldDisplayTabsToast: false } }),
    )
    // Pin an older recorded app version so the layout-upgrade migration cannot force v2.
    localStorage.setItem("app-version.v1", JSON.stringify({ version: "1.17.20" }))
  })

  await page.goto(`/${base64Encode(directory)}/session/${sessionID}`)
  await expectSessionTitle(page, title)

  await assertHeaderButtons(page, page.locator('[data-action="session-status"]'))

  // The terminal toggle is pure local UI state: tapping it flips aria-expanded and
  // reveals the always-mounted #terminal-panel without any server call.
  const terminalBtn = page.locator('[data-action="session-terminal"]')
  await terminalBtn.click()
  await expect(terminalBtn).toHaveAttribute("aria-expanded", "true")
  await expect(page.locator("#terminal-panel")).toBeVisible()
  await expect(page.locator("#terminal-panel")).toHaveAttribute("aria-hidden", "false")
  await terminalBtn.click()
  await expect(terminalBtn).toHaveAttribute("aria-expanded", "false")
})

test("keeps mobile refresh and status on one row inside the viewport (v2 layout)", async ({ page }) => {
  await mockSessionServer(page)
  await page.addInitScript(() => {
    localStorage.setItem(
      "settings.v3",
      JSON.stringify({ general: { newLayoutDesigns: true, showStatus: true, shouldDisplayTabsToast: false } }),
    )
  })

  await page.goto(`/${base64Encode(directory)}/session/${sessionID}`)
  await expectSessionTitle(page, title)

  // The v2 status trigger has no data-action hook; it is the only icon-button-v2
  // inside the same actions row as the refresh button.
  const actionsRow = page.locator('[data-action="session-refresh"]').locator("xpath=..")
  await assertHeaderButtons(page, actionsRow.locator('[data-component="icon-button-v2"]'))
})

async function assertHeaderButtons(page: Page, statusBtn: Locator) {
  const refreshBtn = page.locator('[data-action="session-refresh"]')
  const terminalBtn = page.locator('[data-action="session-terminal"]')

  await expect(refreshBtn).toBeVisible()
  await expect(statusBtn).toBeVisible()
  await expect(terminalBtn).toBeVisible()

  const [r, s, t] = await Promise.all([
    refreshBtn.boundingBox(),
    statusBtn.boundingBox(),
    terminalBtn.boundingBox(),
  ])
  expect(r).not.toBeNull()
  expect(s).not.toBeNull()
  expect(t).not.toBeNull()
  expect(Math.abs(r!.y - s!.y)).toBeLessThan(2)
  expect(Math.abs(t!.y - r!.y)).toBeLessThan(2)

  expect(r!.x).toBeGreaterThanOrEqual(0)
  expect(r!.x + r!.width).toBeLessThanOrEqual(viewport.width)
  expect(s!.x).toBeGreaterThanOrEqual(0)
  expect(s!.x + s!.width).toBeLessThanOrEqual(viewport.width)
  expect(t!.x).toBeGreaterThanOrEqual(0)
  expect(t!.x + t!.width).toBeLessThanOrEqual(viewport.width)

  const sideBySide = r!.x + r!.width <= s!.x + 1 || s!.x + s!.width <= r!.x + 1
  expect(sideBySide).toBe(true)

  // Render order in the mobile actions row is refresh -> status -> terminal.
  const terminalRightOfStatus = t!.x >= s!.x + s!.width - 1
  expect(terminalRightOfStatus).toBe(true)
}

async function mockSessionServer(page: Page) {
  await mockOpenCodeServer(page, {
    directory,
    project: {
      id: projectID,
      worktree: directory,
      vcs: "git",
      name: "session-header-mobile-buttons",
      time: { created: 1700000000000, updated: 1700000000000 },
      sandboxes: [],
    },
    provider: { all: [], connected: [], default: {} },
    sessions: [
      {
        id: sessionID,
        slug: "session-header-mobile-buttons",
        projectID,
        directory,
        title,
        version: "dev",
        time: { created: 1700000000000, updated: 1700000000000 },
      },
    ],
    pageMessages: () => ({ items: [] }),
  })
}
