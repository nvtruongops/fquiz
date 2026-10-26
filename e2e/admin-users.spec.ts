import { test, expect } from '@playwright/test'
import { ADMIN_APP_URL, setAdminAuthCookie } from './helpers/auth'

test.describe('Admin Portal — Users Management', () => {
  test.beforeEach(async ({ context }) => {
    await setAdminAuthCookie(context)
  })

  test('should render users table and filtering controls', async ({ page }) => {
    await page.goto(`${ADMIN_APP_URL}/users`)
    await expect(page.getByRole('heading', { name: /User Management|Users/i })).toBeVisible()

    // Filter controls
    await expect(page.getByPlaceholder(/Search by username or email/i)).toBeVisible()
    await expect(page.getByRole('combobox').first()).toBeVisible()

    // Table headers
    await expect(page.getByRole('columnheader', { name: /Account|User/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Email/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Role/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Status/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Actions|Action/i })).toBeVisible()
  })

  test('should filter users by search term', async ({ page }) => {
    await page.goto(`${ADMIN_APP_URL}/users`)
    const searchInput = page.getByPlaceholder(/Search by username or email/i)
    await searchInput.fill('admin_tester')
    await expect(page.locator('tbody tr').filter({ hasText: 'admin_tester' })).toBeVisible()
  })
})
