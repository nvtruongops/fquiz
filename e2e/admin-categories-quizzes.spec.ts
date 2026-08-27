import { test, expect } from '@playwright/test'
import { ADMIN_APP_URL, setAdminAuthCookie } from './helpers/auth'

test.describe('Admin Portal — Categories & Quizzes Management', () => {
  test.beforeEach(async ({ context }) => {
    await setAdminAuthCookie(context)
  })

  test('should render categories page and allow adding category', async ({ page }) => {
    await page.goto(`${ADMIN_APP_URL}/categories`)
    await expect(page.getByRole('heading', { name: /Quản lý Danh mục Môn thi/i })).toBeVisible()

    // Check add category input and button
    const addInput = page.getByPlaceholder(/Nhập tên danh mục môn thi mới/i)
    const addBtn = page.getByRole('button', { name: /Thêm mới/i })
    await expect(addInput).toBeVisible()
    await expect(addBtn).toBeVisible()

    // Check table
    await expect(page.getByText(/Danh sách Danh mục/i)).toBeVisible()
  })

  test('should render quizzes page with category and status filters', async ({ page }) => {
    await page.goto(`${ADMIN_APP_URL}/quizzes`)
    await expect(page.getByRole('heading', { name: /Quản lý Đề thi/i })).toBeVisible()

    // Search and filters
    await expect(page.getByPlaceholder(/Tìm theo tiêu đề hoặc mã môn/i)).toBeVisible()
    await expect(page.getByRole('combobox').first()).toBeVisible()
  })
})
