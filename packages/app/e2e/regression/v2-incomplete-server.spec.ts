// UPSTREAM-DIVERGENCE-FILE: Added after upstream sync 6b9ce5e63 — regression test for the fork's
// v2-incomplete-server fallback (server-protocol-resilient.ts). Forces an incomplete-v2 server
// (/api/config + /api/mcp answer the SPA index.html as text/html) and asserts the app downgrades to
// healthy v1 without a "Failed to reload" toast. Remove once upstream completes the v2 route migration.

import { expect, test } from "@playwright/test"
import { fixture, pageMessages } from "../smoke/session-timeline.fixture"
import { mockOpenCodeServer } from "../utils/mock-server"
import { expectAppVisible } from "../utils/waits"

test("downgrades to v1 when /api/config and /api/mcp answer text/html", async ({ page }) => {
  await mockOpenCodeServer(page, {
    protocol: "v2",
    sessions: fixture.sessions,
    provider: fixture.provider,
    directory: fixture.directory,
    project: fixture.project,
    pageMessages,
  })

  // Simulate an incomplete v2 migration: the v2 data endpoints answer the SPA index.html instead of
  // JSON. Registered after mockOpenCodeServer so they win (Playwright evaluates routes LIFO). The v1
  // paths (/config, /mcp) are deliberately left untouched so a downgrade keeps the app healthy.
  await page.route("**/api/config*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html><body>SPA fallback</body></html>",
    }),
  )
  await page.route("**/api/mcp*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html><body>SPA fallback</body></html>",
    }),
  )
  // `*` does not cross `/`, so /api/mcp/resource needs its own route.
  await page.route("**/api/mcp/resource*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html><body>SPA fallback</body></html>",
    }),
  )

  await page.addInitScript((directory) => {
    localStorage.setItem(
      "opencode.global.dat:server",
      JSON.stringify({
        projects: { local: [{ worktree: directory, expanded: true }] },
        lastProject: { local: directory },
      }),
    )
  }, fixture.directory)

  await page.goto("/")

  // The downgrade actually happened: a session served by the healthy v1 mock renders, so the app is
  // interactive rather than dead.
  await expectAppVisible(page.getByText(fixture.expected.sourceTitle).first())

  // Bootstrap must not have toast-failed against the broken v2 endpoints.
  await expect(page.getByText(/Failed to reload/)).toHaveCount(0)
})
