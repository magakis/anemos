import { expect, seedMobilePage, test } from '../fixtures'

test.describe('UI 3 settings smoke', () => {
  test('opens the settings surface with Anemos Notifications', async ({ page }) => {
    await seedMobilePage(page)
    await page.goto('?settings=notifications')

    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
    await expect(page.getByText('Anemos Notifications', { exact: true })).toBeVisible()
    await expect(page.getByText('Push relay URL', { exact: true })).toBeVisible()
  })
})
