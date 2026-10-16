import { test, expect } from '@playwright/test'
import { ADMIN_APP_URL, setAdminAuthCookie } from './helpers/auth'

test.describe('Admin Portal — Categories & Quizzes Management', () => {
  test.beforeEach(async ({ context }) => {
    await setAdminAuthCookie(context)
  })

  test('should render categories page and allow adding category', async ({ page }) => {
    await page.goto(`${ADMIN_APP_URL}/categories`)
    await expect(page.getByRole('heading', { name: /Category.*Management|Categories/i })).toBeVisible()

    // Check add category input and button
    const addInput = page.getByPlaceholder(/Enter new category/i)
    const addBtn = page.getByRole('button', { name: /Add New|Add|Create/i })
    await expect(addInput).toBeVisible()
    await expect(addBtn).toBeVisible()

    // Check table
    await expect(page.getByText(/Category List/i).first()).toBeVisible()
  })

  test('should render quizzes page with category and status filters', async ({ page }) => {
    await page.goto(`${ADMIN_APP_URL}/quizzes`)
    await expect(page.getByRole('heading', { name: /Quiz Management|Quizzes/i })).toBeVisible()

    // Search and filters
    await expect(page.getByPlaceholder(/Search by title or course code/i)).toBeVisible()
    await expect(page.getByRole('combobox').first()).toBeVisible()
  })
})
