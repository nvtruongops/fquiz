import { test, expect } from '@playwright/test'

test.describe('Home and Public Navigation', () => {
  test('should load the home page successfully with hero and CTA', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/FQuiz|Quiz|Luyện Thi/i)

    // Verify main CTA or Explore button exists
    const exploreLink = page.getByRole('link', { name: /Khám phá|Bắt đầu|Đăng nhập/i })
    await expect(exploreLink.first()).toBeVisible()
  })

  test('should navigate to explore page and display search header', async ({ page }) => {
    await page.goto('/explore')
    await expect(page).toHaveURL(/.*explore/)
    await expect(page.getByText(/Khám phá Danh mục & Đề Thi|Khám phá/i).first()).toBeVisible()
  })

  test('should redirect unauthenticated users accessing protected dashboard to login with callbackUrl', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(new RegExp('/login.*callbackUrl=%2Fdashboard'))
  })

  test('should display privacy and terms pages without authentication', async ({ page }) => {
    const privacyRes = await page.goto('/privacy')
    expect(privacyRes?.status()).toBe(200)

    const termsRes = await page.goto('/terms')
    expect(termsRes?.status()).toBe(200)
  })
})
