import { test, expect } from '@playwright/test'
import { ADMIN_APP_URL, setAdminAuthCookie } from './helpers/auth'

test.describe('Admin Portal — Dashboard & Navigation', () => {
  test.beforeEach(async ({ context }) => {
    await setAdminAuthCookie(context)
  })

  test('should display dashboard overview and key metrics', async ({ page }) => {
    await page.goto(`${ADMIN_APP_URL}/`)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    // Metric cards
    await expect(page.getByText(/Mã môn/i)).toBeVisible()
    await expect(page.getByText(/Mã quiz/i)).toBeVisible()
    await expect(page.getByText(/Học viên/i).first()).toBeVisible()
    await expect(page.getByText(/Lượt thi/i)).toBeVisible()

    // Recent registered users section
    await expect(page.getByText(/Đăng ký gần đây/i)).toBeVisible()
  })

  test('should navigate across sidebar links properly', async ({ page }) => {
    await page.goto(`${ADMIN_APP_URL}/`)

    // Navigate to Users
    await page.getByRole('link', { name: 'Học viên' }).first().click()
    await expect(page).toHaveURL(`${ADMIN_APP_URL}/users`)
    await expect(page.getByRole('heading', { name: /Quản lý Tài khoản/i })).toBeVisible()

    // Navigate to Categories
    await page.getByRole('link', { name: 'Categories' }).first().click()
    await expect(page).toHaveURL(`${ADMIN_APP_URL}/categories`)
    await expect(page.getByRole('heading', { name: /Quản lý Danh mục Môn thi/i })).toBeVisible()

    // Navigate to Quizzes
    await page.getByRole('link', { name: 'Quizzes' }).first().click()
    await expect(page).toHaveURL(`${ADMIN_APP_URL}/quizzes`)
    await expect(page.getByRole('heading', { name: /Quản lý Đề thi/i })).toBeVisible()

    // Navigate to Question Bank
    await page.getByRole('link', { name: 'Ngân hàng câu hỏi' }).first().click()
    await expect(page).toHaveURL(`${ADMIN_APP_URL}/question-bank`)
    await expect(page.getByRole('heading', { name: /Ngân hàng Câu hỏi/i })).toBeVisible()

    // Navigate to Feedback
    await page.getByRole('link', { name: 'Góp ý' }).first().click()
    await expect(page).toHaveURL(`${ADMIN_APP_URL}/feedback`)
    await expect(page.getByRole('heading', { name: /Hộp thư Góp ý & Báo lỗi/i })).toBeVisible()

    // Navigate to Settings
    await page.getByRole('link', { name: 'Cài đặt' }).first().click()
    await expect(page).toHaveURL(`${ADMIN_APP_URL}/settings`)
    await expect(page.getByRole('heading', { name: /Cấu hình Hệ thống/i })).toBeVisible()
  })
})
