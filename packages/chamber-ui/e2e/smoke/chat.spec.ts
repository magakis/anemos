import { expect, seedMobilePage, test } from '../fixtures'

test.describe('UI 3 chat smoke', () => {
  test.setTimeout(120_000)

  test('creates a session, submits a prompt, and renders the streamed timeline', async ({ page, sdk, withSession }) => {
    const prompt = 'Reply with one short sentence confirming the UI 3 smoke test.'

    // A scratch server may not have provider credentials. In that modelless case
    // the UI must retain the composer and expose its explicit no-model error;
    // configured scratch servers continue through the assistant timeline branch.
    await withSession({ title: 'UI 3 chat smoke session' }, async (session) => {
      await seedMobilePage(page)
      await page.goto(`?session=${encodeURIComponent(session.id)}`)

      const pill = page.locator('[data-mobile-composer-pill="true"]')
      await expect(pill).toBeVisible()
      await pill.locator('button').last().click()

      // ANEMOS-PATCH: target CodeMirror's editable node rather than its wrapper div.
      const editor = page.locator('[data-testid="chat-input"] [contenteditable="true"]')
      await expect(editor).toBeVisible()
      await editor.fill(prompt)

      const sendButton = page.getByRole('button', { name: 'Send message', exact: true })
      await expect(sendButton).toBeEnabled()
      await sendButton.click()

      const userMessage = page.locator('[data-message-id]').filter({ hasText: prompt }).first()
      const noModelToast = page.locator('[data-sonner-toast]').filter({ hasText: /provider and model/i }).first()
      let submissionOutcome: 'pending' | 'user' | 'modelless' = 'pending'

      await expect
        .poll(
          async () => {
            if (await userMessage.count()) submissionOutcome = 'user'
            else if (await noModelToast.count()) submissionOutcome = 'modelless'
            else submissionOutcome = 'pending'
            return submissionOutcome
          },
          { timeout: 45_000 },
        )
        .not.toBe('pending')

      if (submissionOutcome === 'modelless') {
        await expect(noModelToast).toBeVisible()
        return
      }

      await expect(userMessage).toBeVisible()

      const messages = page.locator('[data-message-id]')
      const hasAssistantPart = async (): Promise<boolean> => {
        const response = await sdk.session.messages({ sessionID: session.id, directory: session.directory })
        if (response.error !== undefined || !Array.isArray(response.data)) return false
        return response.data.some((message) =>
          message.info.role === 'assistant'
          && message.parts.some((part) => part.type === 'text' && Boolean(part.text?.trim())),
        )
      }
      let responseOutcome: 'pending' | 'assistant' | 'error' = 'pending'
      await expect
        .poll(
          async () => {
            if (await hasAssistantPart()) responseOutcome = 'assistant'
            else {
              const toastText = (await page.locator('[data-sonner-toast]').allTextContents()).join(' ')
              responseOutcome = /failed|error|provider|model/i.test(toastText) ? 'error' : 'pending'
            }
            return responseOutcome
          },
          { timeout: 90_000 },
        )
        .not.toBe('pending')

      if (responseOutcome === 'error') {
        await expect(page.locator('[data-sonner-toast]').first()).toContainText(/failed|error|provider|model/i)
        return
      }

      await expect.poll(() => messages.count(), { timeout: 30_000 }).toBeGreaterThan(1)
      const assistantMessage = messages.nth(1)
      await expect(assistantMessage).toBeVisible()
      await expect
        .poll(async () => (await assistantMessage.textContent())?.trim().length ?? 0, { timeout: 90_000 })
        .toBeGreaterThan(0)
    })
  })
})
