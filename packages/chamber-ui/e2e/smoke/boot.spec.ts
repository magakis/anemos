import { expect, scratchDirectory, seedMobilePage, test } from '../fixtures'

test.describe('UI 3 boot smoke', () => {
  test('loads the sessions surface against the scratch backend', async ({ page, withSession }) => {
    const title = 'UI 3 boot smoke session'
    // ANEMOS-PATCH: use the backend's managed-chat scope so an empty smoke session is visible before its first message.
    const directory = `${scratchDirectory.replace(/\/+$/, '')}/.config/openchamber/chats/ui3-e2e`

    await withSession({ title, directory }, async () => {
      await seedMobilePage(page, { directory })
      await page.goto('./')

      const sessionsButton = page.getByRole('button', { name: 'Open sessions and projects' })
      await expect(sessionsButton).toBeVisible()
      await sessionsButton.click()

      const sessionsSurface = page.getByRole('dialog', { name: 'Sessions' })
      await expect(sessionsSurface).toBeVisible()
      await expect(sessionsSurface.getByText(title, { exact: true })).toBeVisible()
    })
  })
})
