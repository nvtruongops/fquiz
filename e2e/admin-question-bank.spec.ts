import { test, expect } from '@playwright/test'
import { ADMIN_APP_URL, setAdminAuthCookie } from './helpers/auth'

test.describe('Admin Portal — Question Bank Hub', () => {
  test.beforeEach(async ({ context }) => {
    await setAdminAuthCookie(context)
  })

  test('should render Question Bank tabs and navigate between them', async ({ page }) => {
    await page.goto(`${ADMIN_APP_URL}/question-bank`)
    await expect(page.getByRole('heading', { name: /Ngân hàng Câu hỏi/i }).first()).toBeVisible()

    // Check all 4 tab triggers
    const statusTab = page.getByRole('tab', { name: 'Trạng thái' })
    const analyticsTab = page.getByRole('tab', { name: 'Thống kê' })
    const migrationTab = page.getByRole('tab', { name: 'Migration' })
    const conflictsTab = page.getByRole('tab', { name: 'Conflicts' })

    await expect(statusTab).toBeVisible()
    await expect(analyticsTab).toBeVisible()
    await expect(migrationTab).toBeVisible()
    await expect(conflictsTab).toBeVisible()

    // Navigate to Analytics tab
    await analyticsTab.click()
    await expect(page.getByText(/Thống kê Ngân hàng Câu hỏi/i)).toBeVisible()

    // Navigate to Conflicts tab
    await conflictsTab.click()
    await expect(page.getByText(/Chọn môn học/i)).toBeVisible()

    // Navigate to Migration tab
    await migrationTab.click()
    await expect(page.getByText(/Migration Ngân hàng Câu hỏi/i)).toBeVisible()
  })
})
