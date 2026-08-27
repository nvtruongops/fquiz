import { test, expect } from '@playwright/test'
import { mockCategories, mockAuthUser } from './helpers/mock-data'

test.describe('Explore and Course Discovery (/explore & /courses/[code])', () => {
  test.beforeEach(async ({ page }) => {
    await mockCategories(page, [
      { id: 'cat-prn211', name: 'PRN211', publishedQuizCount: 8 },
      { id: 'cat-dbs401', name: 'DBS401', publishedQuizCount: 5 },
      { id: 'cat-mln111', name: 'MLN111', publishedQuizCount: 12 },
      { id: 'cat-swp391', name: 'SWP391', publishedQuizCount: 3 },
    ])
  })

  test('should display categories grid and search bar', async ({ page }) => {
    await page.goto('/explore')

    // Verify search input
    const searchInput = page.getByPlaceholder(/Tìm kiếm môn học/i)
    await expect(searchInput).toBeVisible()

    // Verify category cards render
    await expect(page.getByText('PRN211')).toBeVisible()
    await expect(page.getByText('DBS401')).toBeVisible()
    await expect(page.getByText('MLN111')).toBeVisible()
  })

  test('should filter categories in real-time when user types in search bar', async ({ page }) => {
    await page.goto('/explore')

    const searchInput = page.getByPlaceholder(/Tìm kiếm môn học/i)
    await searchInput.fill('PRN')

    // PRN211 should be visible, MLN111 should be hidden
    await expect(page.getByText('PRN211')).toBeVisible()
    await expect(page.getByText('MLN111')).not.toBeVisible()

    // Clear search with clear button
    const clearBtn = page.getByTitle(/Xóa tìm kiếm/i)
    if (await clearBtn.isVisible()) {
      await clearBtn.click()
      await expect(page.getByText('MLN111')).toBeVisible()
    }
  })

  test('should navigate to course detail page when clicking a category card', async ({ page }) => {
    // Mock course quizzes endpoint
    await page.route('**/api/courses/prn211/quizzes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          categoryName: 'PRN211',
          categoryId: 'cat-prn211',
          isCategoryPinned: false,
          quizzes: [
            {
              _id: 'quiz-prn211-1',
              title: 'Đề thi trắc nghiệm C# & .NET Core (PRN211)',
              description: 'Bộ đề 50 câu ôn tập cuối kỳ',
              course_code: 'PRN211',
              questionCount: 50,
              studentCount: 88,
              created_at: new Date().toISOString(),
            },
          ],
        }),
      })
    })

    await page.goto('/explore')

    // Click PRN211 card
    const prnCard = page.getByText('PRN211')
    await prnCard.click()

    // Verify URL navigation
    await expect(page).toHaveURL(/.*courses.*prn211/i)
  })

  test('should allow pinning category when user is authenticated', async ({ page }) => {
    await mockAuthUser(page)

    await page.goto('/explore')

    // Find pin button
    const pinBtn = page.getByTitle(/Ghim danh mục lên đầu|Bỏ ghim danh mục/i).first()
    await expect(pinBtn).toBeVisible()
    await pinBtn.click()

    // Verify toast confirmation
    await expect(page.getByText(/Đã ghim danh mục|Đã bỏ ghim danh mục/i)).toBeVisible()
  })
})
