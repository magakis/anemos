import { expect, test } from '../fixtures'

const unreachableBackendUrl = 'http://127.0.0.1:9'

test.describe('UI 3 boot guard smoke', () => {
  test('shows the resolved backend when the server is unreachable', async ({ page }) => {
    await page.addInitScript((deadUrl) => {
      Object.defineProperty(window, '__OPENCHAMBER_API_BASE_URL__', {
        configurable: true,
        enumerable: true,
        get: () => deadUrl,
        set: () => undefined,
      })
    }, unreachableBackendUrl)
    await page.goto('./')

    await expect(page.getByRole('heading', { name: 'Backend too old / not v2-compatible' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(unreachableBackendUrl, { exact: true })).toBeVisible()
    await expect(page.getByText(`GET ${unreachableBackendUrl}/global/health`, { exact: true })).toBeVisible()
  })
})
