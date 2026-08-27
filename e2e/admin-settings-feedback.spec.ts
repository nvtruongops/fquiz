import { test, expect } from '@playwright/test'
import { ADMIN_APP_URL, setAdminAuthCookie } from './helpers/auth'

test.describe('Admin Portal — Settings & Feedback', () => {
  test.beforeEach(async ({ context }) => {
    await setAdminAuthCookie(context)
  })

  test('should render settings tabs for General, Security, and AI LLM', async ({ page }) => {
    await page.goto(`${ADMIN_APP_URL}/settings`)
    await expect(page.getByRole('heading', { name: /Cấu hình Hệ thống/i })).toBeVisible()

    const generalTab = page.getByRole('button', { name: /Hiển thị chung/i })
    const securityTab = page.getByRole('button', { name: /Bảo mật & Thi cử/i })
    const aiTab = page.getByRole('button', { name: /Cấu hình LLM \/ AI/i })

    await expect(generalTab).toBeVisible()
    await expect(securityTab).toBeVisible()
    await expect(aiTab).toBeVisible()

    // Check General tab fields
    await expect(page.getByText(/Tên ứng dụng/i)).toBeVisible()
    await expect(page.getByText(/Giao diện \(Maintenance\)/i)).toBeVisible()

    // Switch to Security tab
    await securityTab.click()
    await expect(page.getByText(/Chống chia sẻ tài khoản/i)).toBeVisible()

    // Switch to AI tab
    await aiTab.click()
    await expect(page.getByRole('button', { name: 'gemini' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'openai' })).toBeVisible()
  })

  test('should render feedback inbox with filters', async ({ page }) => {
    await page.goto(`${ADMIN_APP_URL}/feedback`)
    await expect(page.getByRole('heading', { name: /Hộp thư Góp ý & Báo lỗi/i })).toBeVisible()
    await expect(page.getByPlaceholder(/Tìm theo nội dung/i)).toBeVisible()
  })
})
