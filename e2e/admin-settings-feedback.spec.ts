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
    await expect(page.getByRole('heading', { name: /Cấu hình Hệ thống/i })).toBeVisible()

    const generalTab = page.getByRole('button', { name: /Hiển thị chung/i })
    const securityTab = page.getByRole('button', { name: /Bảo mật/i })
    const aiTab = page.getByRole('button', { name: /Cấu hình LLM/i })

    await expect(generalTab).toBeVisible()
    await expect(securityTab).toBeVisible()
    await expect(aiTab).toBeVisible()

    // Check General tab fields
    await expect(page.getByText(/Tên ứng dụng/i)).toBeVisible()

    // Switch to Security tab
    await securityTab.click()
    await expect(page.getByText(/Bảo vệ phiên đăng nhập/i).or(page.getByText(/Chống chia sẻ/i)).or(page.getByText(/Bảo mật/i)).first()).toBeVisible()

    // Switch to AI tab
    await aiTab.click()
    await expect(page.getByText(/Gemini/i).first()).toBeVisible()
  })

  test('should render feedback inbox with filters', async ({ page }) => {
    await page.goto(`${ADMIN_APP_URL}/feedback`)
    await expect(page.getByRole('heading', { name: /Hộp thư Góp ý & Báo lỗi/i })).toBeVisible()
    await expect(page.getByPlaceholder(/Tìm theo nội dung/i)).toBeVisible()
  })
})
