import { expect, seedMobilePage, test } from '../fixtures'

test.describe('UI 3 boot smoke', () => {
  test('loads the sessions surface against the scratch backend', async ({ page, withSession }) => {
    const title = 'UI 3 boot smoke session'

    await withSession({ title }, async () => {
      await seedMobilePage(page)
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
