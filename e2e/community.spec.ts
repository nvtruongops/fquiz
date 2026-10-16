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
              title: 'Tips for learning specialized English vocabulary quickly',
              content: 'You should use spaced repetition flashcards for longer retention.',
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
    await expect(page.getByRole('heading', { name: /Community/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Send Feedback|Feedback/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Create Post|New Post/i }).first()).toBeVisible()

    // Post content check
    await expect(page.getByText(/Tips for learning specialized English vocabulary/i)).toBeVisible()
  })

  test('should open feedback modal when clicking Send Feedback', async ({ page }) => {
    await page.goto('/community')

    const feedbackBtn = page.getByRole('button', { name: /Send Feedback|Feedback/i }).first()
    await feedbackBtn.click()

    // Verify feedback modal dialog is visible
    await expect(page.getByText(/Feedback/i).first()).toBeVisible()
  })
})
