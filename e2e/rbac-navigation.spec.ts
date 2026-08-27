import { test, expect } from '@playwright/test'

test.describe('Role-Based Access Control & Navigation Security', () => {
  test('should protect student dashboard and redirect to login with callbackUrl', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(new RegExp('/login.*callbackUrl=%2Fdashboard'))
  })

  test('should protect student profile page and redirect to login', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(new RegExp('/login.*callbackUrl=%2Fprofile'))
  })

  test('should protect student settings page and redirect to login', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(new RegExp('/login.*callbackUrl=%2Fsettings'))
  })

  test('should protect student history page and redirect to login', async ({ page }) => {
    await page.goto('/history')
    await expect(page).toHaveURL(new RegExp('/login.*callbackUrl=%2Fhistory'))
  })

  test('should protect teacher routes and redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/teacher')
    await expect(page).toHaveURL(new RegExp('/login.*callbackUrl=%2Fteacher'))
  })

  test('should protect admin routes and redirect unauthenticated users to admin login or dedicated admin app', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/fquiz-admin|\/login|:3001/)
  })

  test('should sanitize malicious open redirect attempts in callbackUrl', async ({ page }) => {
    await page.goto('/login?callbackUrl=https://malicious-site.com')
    // Form should still render safely without auto-redirecting to external URL
    await expect(page.getByRole('heading', { name: /Đăng nhập/i })).toBeVisible()
  })
})
