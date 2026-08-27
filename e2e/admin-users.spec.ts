import { test, expect } from '@playwright/test'
import { ADMIN_APP_URL, setAdminAuthCookie } from './helpers/auth'

test.describe('Admin Portal — Users Management', () => {
  test.beforeEach(async ({ context }) => {
    await setAdminAuthCookie(context)
  })

  test('should render users table and filtering controls', async ({ page }) => {
    await page.goto(`${ADMIN_APP_URL}/users`)
    await expect(page.getByRole('heading', { name: /Quản lý Tài khoản/i })).toBeVisible()

    // Filter controls
    await expect(page.getByPlaceholder(/Tìm theo username hoặc email/i)).toBeVisible()
    await expect(page.getByRole('combobox').first()).toBeVisible()

    // Table headers
    await expect(page.getByRole('columnheader', { name: /Tài khoản/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Email/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Vai trò/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Trạng thái/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Thao tác/i })).toBeVisible()
  })

  test('should filter users by search term', async ({ page }) => {
    await page.goto(`${ADMIN_APP_URL}/users`)
    const searchInput = page.getByPlaceholder(/Tìm theo username hoặc email/i)
    await searchInput.fill('minh')
    await page.waitForTimeout(400) // Debounce
    await expect(page.locator('tbody tr').first()).toBeVisible()
  })
})
