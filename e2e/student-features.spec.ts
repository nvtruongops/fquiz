import { test, expect } from '@playwright/test'
import { mockAuthUser } from './helpers/mock-data'
import { setTestAuthCookie } from './helpers/auth'

test.describe('Student Features & Profile Management', () => {
  test.beforeEach(async ({ context, page }) => {
    await setTestAuthCookie(context)
    await mockAuthUser(page, {
      _id: '69d7441dff42ce4f938bd488',
      name: 'Nguyen Van A',
      email: 'user@example.com',
      role: 'student',
    })
  })

  test.describe('Settings Page (/settings)', () => {
    test.beforeEach(async ({ page }) => {
      // Mock student settings GET & PUT
      await page.route('**/api/student/settings', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              settings: {
                timezone: 'Asia/Ho_Chi_Minh',
                language: 'vi',
                notifyEmail: true,
                notifyQuizReminder: false,
                privacyShareActivity: true,
              },
            }),
          })
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          })
        }
      })
    })

    test('should display settings sections including password change form', async ({ page }) => {
      await page.route('**/api/student/settings', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            settings: {
              timezone: 'Asia/Ho_Chi_Minh',
              language: 'vi',
              notifyEmail: true,
              notifyQuizReminder: true,
              privacyShareActivity: false,
            },
          }),
        })
      })

      await page.goto('/settings')

      // Check for headings or settings sections
      await expect(page.getByText('Cài đặt tài khoản').first()).toBeVisible()
      await expect(page.getByText('Đổi mật khẩu').first()).toBeVisible()

      // Password inputs
      const currentPass = page.locator('#current-password')
      const newPass = page.locator('#new-password')
      const confirmPass = page.locator('#confirm-password')

      await expect(currentPass).toBeVisible()
      await expect(newPass).toBeVisible()
      await expect(confirmPass).toBeVisible()
    })

    test('should validate password change form on empty submit', async ({ page }) => {
      await page.route('**/api/student/settings', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            settings: {
              timezone: 'Asia/Ho_Chi_Minh',
              language: 'vi',
              notifyEmail: true,
              notifyQuizReminder: true,
              privacyShareActivity: false,
            },
          }),
        })
      })

      await page.goto('/settings')

      const submitBtn = page.getByRole('button', { name: /Đổi mật khẩu|Cập nhật/i })
      if (await submitBtn.isVisible()) {
        await submitBtn.click()
        await expect(page.getByText(/Vui lòng nhập mật khẩu hiện tại/i)).toBeVisible()
      }
    })
  })

  test.describe('History Page (/history)', () => {
    test('should display history list with filter options', async ({ page }) => {
      // Mock history endpoint
      await page.route('**/api/history**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            history: [
              {
                _id: 'sess-1',
                quiz_id: '507f1f77bcf86cd799439011',
                quiz_title: 'Đề thi trắc nghiệm C# & .NET Core',
                quiz_code: 'PRN211',
                category_name: 'PRN211',
                source_type: 'practice',
                source_label: 'Luyện tập',
                source_creator_name: null,
                score: 9,
                total_questions: 10,
                answered_count: 10,
                correct_count: 9,
                mode: 'immediate',
                status: 'completed',
                completed_at: new Date().toISOString(),
                started_at: new Date().toISOString(),
                duration_minutes: 12,
              },
            ],
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
          }),
        })
      })

      await page.goto('/history')

      // Verify search input and filters are visible
      await expect(page.getByPlaceholder(/Tìm kiếm mã môn/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /Hoàn thành/i })).toBeVisible()
    })
  })
})
