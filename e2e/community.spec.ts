import { test, expect } from '@playwright/test'
import { setTestAuthCookie } from './helpers/auth'
import { mockAuthUser } from './helpers/mock-data'

test.describe('Community & Discussions Feed (/community)', () => {
  test.beforeEach(async ({ context, page }) => {
    await setTestAuthCookie(context)
    await mockAuthUser(page, {
      _id: '69d7441dff42ce4f938bd488',
      name: 'Nguyen Van A',
      email: 'user@example.com',
      role: 'student',
    })

    // Mock community posts API
    await page.route('**/api/community/posts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          posts: [
            {
              _id: 'post-1',
              title: 'Chia sẻ mẹo học thuộc nhanh từ vựng Tiếng Anh chuyên ngành',
              content: 'Các bạn nên dùng Flashcard lặp lại ngắt quãng để ghi nhớ lâu hơn.',
              author: {
                _id: '69d7441dff42ce4f938bd488',
                name: 'Nguyen Van A',
                email: 'user@example.com',
                avatar: null,
              },
              tags: ['tienganh', 'flashcard'],
              likesCount: 15,
              commentsCount: 3,
              viewsCount: 120,
              isLiked: false,
              createdAt: new Date().toISOString(),
              comments: [],
            },
          ],
          hasMore: false,
          total: 1,
        }),
      })
    })

    // Mock active users count / sidebar info if requested
    await page.route('**/api/community/stats**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          activeUsers: 42,
          totalPosts: 150,
          popularTags: ['tienganh', 'triethoc', 'toancc'],
        }),
      })
    })
  })

  test('should display community header, banner, and posts feed', async ({ page }) => {
    await page.goto('/community')

    // Header checks
    await expect(page.getByRole('heading', { name: /Cộng đồng Học tập FQuiz/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Gửi góp ý', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Tạo bài viết/i })).toBeVisible()

    // Post content check
    await expect(page.getByText(/Chia sẻ mẹo học thuộc nhanh từ vựng/i)).toBeVisible()
  })

  test('should open feedback modal when clicking "Gửi góp ý"', async ({ page }) => {
    await page.goto('/community')

    const feedbackBtn = page.getByRole('button', { name: 'Gửi góp ý', exact: true })
    await feedbackBtn.click()

    // Verify feedback modal dialog is visible
    await expect(page.getByText(/Góp ý phát triển FQuiz/i)).toBeVisible()
    await expect(page.getByText(/Báo lỗi/i).first()).toBeVisible()
  })
})
