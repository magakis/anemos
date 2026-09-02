import { expect, seedMobilePage, test } from '../fixtures'

test.describe('UI 3 settings smoke', () => {
  test('opens settings without push surfaces in the sideload era', async ({ page }) => {
    await seedMobilePage(page)

    await page.goto('?settings=appearance')
    await expect(page.getByText('Color mode & Theme', { exact: true })).toBeVisible()

    await page.goto('?settings=notifications')

    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
    await expect(page.getByText('Anemos Notifications', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Push relay URL', { exact: true })).toHaveCount(0)
  })
})
