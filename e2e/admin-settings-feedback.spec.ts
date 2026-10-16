import { test, expect } from '@playwright/test'
import { ADMIN_APP_URL, setAdminAuthCookie } from './helpers/auth'

test.describe('Admin Portal — Settings & Feedback', () => {
  test.beforeEach(async ({ context }) => {
    await setAdminAuthCookie(context)
  })

  test('should render settings tabs for General, Security, and AI LLM', async ({ page }) => {
    await page.route('**/api/settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          settings: {
            app_name: 'FQuiz',
            maintenance_mode: false,
            prevent_concurrent_login: true,
            llm_config: { active_provider: 'gemini', gemini: { api_key: '', model: 'gemini-1.5-flash' }, openai: { api_key: '', model: 'gpt-4o-mini' } },
          },
        }),
      })
    })

    await page.goto(`${ADMIN_APP_URL}/settings`)
    await expect(page.getByRole('heading', { name: /System Settings|Settings/i })).toBeVisible()

    const generalTab = page.getByRole('button', { name: /General/i })
    const securityTab = page.getByRole('button', { name: /Security/i })
    const aiTab = page.getByRole('button', { name: /AI LLM|LLM/i })

    await expect(generalTab).toBeVisible()
    await expect(securityTab).toBeVisible()
    await expect(aiTab).toBeVisible()

    // Check General tab fields
    await expect(page.getByText(/App Name|Application Name/i)).toBeVisible()

    // Switch to Security tab
    await securityTab.click()
    await expect(page.getByText(/Session Protection|Security/i).first()).toBeVisible()

    // Switch to AI tab
    await aiTab.click()
    await expect(page.getByText(/Gemini/i).first()).toBeVisible()
  })

  test('should render feedback inbox with filters', async ({ page }) => {
    await page.goto(`${ADMIN_APP_URL}/feedback`)
    await expect(page.getByRole('heading', { name: /Feedback & Bug Reports|Feedback/i })).toBeVisible()
    await expect(page.getByPlaceholder(/Search.*content|Search.*feedback/i)).toBeVisible()
  })
})
