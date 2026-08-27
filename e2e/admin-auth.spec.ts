import { test, expect } from '@playwright/test'
import { ADMIN_APP_URL, setAdminAuthCookie } from './helpers/auth'

test.describe('Admin Portal — Authentication & Security Proxy', () => {
  test('should redirect unauthenticated user to /login', async ({ page }) => {
    await page.goto(`${ADMIN_APP_URL}/`)
    await expect(page).toHaveURL(new RegExp(`${ADMIN_APP_URL}/login`))
    await expect(page.getByRole('heading', { name: /FQuiz Admin Console/i })).toBeVisible()
  })

  test('should block unauthorized API requests with 401', async ({ request }) => {
    const res = await request.get(`${ADMIN_APP_URL}/api/users`)
    expect(res.status()).toBe(401)
    const json = await res.json()
    expect(json.error).toContain('Unauthorized')
  })

  test('should allow authenticated admin to login via form', async ({ page }) => {
    await page.goto(`${ADMIN_APP_URL}/login`)
    await page.getByPlaceholder(/admin@fquiz.vn/i).fill('admin@example.com')
    await page.getByPlaceholder(/••••••••/i).fill('Admin@123456')
    await page.getByRole('button', { name: /Đăng nhập/i }).click()

    await expect(page).toHaveURL(`${ADMIN_APP_URL}/`)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByText(/Mã môn/i)).toBeVisible()
  })

  test('should allow authenticated admin with cookie to access dashboard', async ({ context, page }) => {
    await setAdminAuthCookie(context)
    await page.goto(`${ADMIN_APP_URL}/`)
    await expect(page).toHaveURL(`${ADMIN_APP_URL}/`)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByText(/Mã môn/i)).toBeVisible()
  })

  test('should successfully logout and redirect to login page', async ({ context, page }) => {
    await setAdminAuthCookie(context)
    await page.goto(`${ADMIN_APP_URL}/`)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    const logoutBtn = page.getByRole('button', { name: /Đăng xuất/i }).first()
    await expect(logoutBtn).toBeVisible()
    await logoutBtn.click()

    await expect(page).toHaveURL(new RegExp(`${ADMIN_APP_URL}/login`))
  })
})
