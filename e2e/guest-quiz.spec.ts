import { test, expect } from '@playwright/test'

test.describe('Guest Quiz Mode (Anonymous Server Session)', () => {
  const mockQuizId = '507f1f77bcf86cd799439011'
  const mockSessionId = '607f1f77bcf86cd799439022'

  test.beforeEach(async ({ page }) => {
    // Mock public quiz detail API to ensure consistent testing environment
    await page.route(`**/api/v1/public/quizzes/${mockQuizId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          _id: mockQuizId,
          title: 'Đề thi thử Triết học Mác - Lênin (Guest E2E Test)',
          course_code: 'MLN111',
          description: 'Bài kiểm tra mẫu cho chế độ khách',
          category_id: { _id: 'cat123', name: 'Khoa học Chính trị' },
          questions: [
            {
              _id: 'q1',
              question_id: 'Q-001',
              text: 'Triết học ra đời vào khoảng thời gian nào?',
              options: ['Thế kỷ VIII - VI TCN', 'Thế kỷ X TCN', 'Thế kỷ I SCN', 'Thế kỷ V SCN'],
            },
            {
              _id: 'q2',
              question_id: 'Q-002',
              text: 'Đối tượng nghiên cứu của triết học là gì?',
              options: ['Các quy luật chung nhất của tự nhiên, xã hội và tư duy', 'Thế giới tự nhiên', 'Tư duy con người', 'Xã hội loài người'],
            },
          ],
          total_questions: 2,
          is_public: true,
          status: 'published',
        }),
      })
    })

    // Mock active sessions check for unauthenticated guest
    await page.route('**/api/sessions?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ assessmentSession: null, learningSession: null }),
      })
    })
  })

  test('Guest clicks "Bắt đầu ngay" -> Displays GuestHistoryReminderModal', async ({ page }) => {
    await page.goto(`/quiz/${mockQuizId}`)

    // Click "Bắt đầu ngay"
    const startButton = page.getByRole('button', { name: /Bắt đầu ngay/i })
    await expect(startButton).toBeVisible()
    await startButton.click()

    // Verify GuestHistoryReminderModal is rendered
    const modalTitle = page.getByText(/LƯU LẠI TIẾN TRÌNH HỌC TẬP/i)
    await expect(modalTitle).toBeVisible()

    const guestBadge = page.getByText(/Chế độ Khách · Guest Mode/i)
    await expect(guestBadge).toBeVisible()

    const loginButton = page.getByRole('button', { name: /Đăng nhập để lưu tiến trình/i })
    await expect(loginButton).toBeVisible()

    const continueGuestButton = page.getByRole('button', { name: /Tiếp tục làm bài với tư cách Khách/i })
    await expect(continueGuestButton).toBeVisible()
  })

  test('Guest continues from modal -> Opens mode selection modal', async ({ page }) => {
    await page.goto(`/quiz/${mockQuizId}`)

    // Open reminder modal
    await page.getByRole('button', { name: /Bắt đầu ngay/i }).click()

    // Click "Tiếp tục làm bài với tư cách Khách"
    const continueGuestBtn = page.getByRole('button', { name: /Tiếp tục làm bài với tư cách Khách/i })
    await continueGuestBtn.click()

    // Verify reminder modal closes and mode selection modal opens
    const modeSelectTitle = page.getByText(/Tùy chọn chế độ/i)
    await expect(modeSelectTitle).toBeVisible()

    // Verify practice options
    await expect(page.getByText(/Luyện tập từng câu/i)).toBeVisible()
    await expect(page.getByText(/Kiểm tra tính điểm/i)).toBeVisible()
    await expect(page.getByText(/Học lật thẻ/i)).toBeVisible()
  })

  test('Guest creates session & takes quiz -> redirects to session runner', async ({ page }) => {
    // Mock session creation for guest
    await page.route('**/api/sessions', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: mockSessionId,
            mode: 'immediate',
            difficulty: 'sequential',
            isGuest: true,
          }),
        })
      } else {
        await route.fallback()
      }
    })

    // Mock session runner metadata & questions
    await page.route(`**/api/sessions/${mockSessionId}/questions`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: mockSessionId,
          mode: 'immediate',
          status: 'active',
          totalQuestions: 2,
          questions: [
            {
              _id: 'q1',
              question_id: 'Q-001',
              text: 'Triết học ra đời vào khoảng thời gian nào?',
              options: ['Thế kỷ VIII - VI TCN', 'Thế kỷ X TCN', 'Thế kỷ I SCN', 'Thế kỷ V SCN'],
            },
            {
              _id: 'q2',
              question_id: 'Q-002',
              text: 'Đối tượng nghiên cứu của triết học là gì?',
              options: ['Các quy luật chung nhất của tự nhiên, xã hội và tư duy', 'Thế giới tự nhiên', 'Tư duy con người', 'Xã hội loài người'],
            },
          ],
        }),
      })
    })

    await page.route(`**/api/sessions/${mockSessionId}`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            session: {
              _id: mockSessionId,
              mode: 'immediate',
              status: 'active',
              current_question_index: 0,
              totalQuestions: 2,
              user_answers: [],
              is_guest: true,
            },
            question: {
              _id: 'q1',
              text: 'Triết học ra đời vào khoảng thời gian nào?',
              options: ['Thế kỷ VIII - VI TCN', 'Thế kỷ X TCN', 'Thế kỷ I SCN', 'Thế kỷ V SCN'],
            },
          }),
        })
      } else {
        await route.fallback()
      }
    })

    await page.goto(`/quiz/${mockQuizId}`)

    // Click "Bắt đầu ngay" -> "Tiếp tục làm bài với tư cách Khách" -> "Bắt đầu làm bài"
    await page.getByRole('button', { name: /Bắt đầu ngay/i }).click()
    await page.getByRole('button', { name: /Tiếp tục làm bài với tư cách Khách/i }).click()

    const startExamBtn = page.getByRole('button', { name: /Bắt đầu làm bài/i })
    await expect(startExamBtn).toBeVisible()
    await startExamBtn.click()

    // Verify URL transitions to session runner
    await expect(page).toHaveURL(new RegExp(`/quiz/${mockQuizId}/session/${mockSessionId}`))
  })

  test('Guest Result Page -> Displays GuestClaimBanner and handles Claim flow', async ({ page }) => {
    // Mock result endpoint for completed guest session
    await page.route(`**/api/sessions/${mockSessionId}/result`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: mockSessionId,
          quizId: mockQuizId,
          mode: 'immediate',
          score: 2,
          totalQuestions: 2,
          completed_at: new Date().toISOString(),
          is_guest: true,
          user_answers: [
            { question_index: 0, answer_index: 0, is_correct: true },
            { question_index: 1, answer_index: 0, is_correct: true },
          ],
          questions: [
            {
              _id: 'q1',
              text: 'Triết học ra đời vào khoảng thời gian nào?',
              options: ['Thế kỷ VIII - VI TCN', 'Thế kỷ X TCN', 'Thế kỷ I SCN', 'Thế kỷ V SCN'],
              correct_answer: 0,
              submitted_answer: 0,
              is_correct: true,
            },
            {
              _id: 'q2',
              text: 'Đối tượng nghiên cứu của triết học là gì?',
              options: ['Các quy luật chung nhất của tự nhiên, xã hội và tư duy', 'Thế giới tự nhiên', 'Tư duy con người', 'Xã hội loài người'],
              correct_answer: 0,
              submitted_answer: 0,
              is_correct: true,
            },
          ],
        }),
      })
    })

    // Navigate to completed result page
    await page.goto(`/quiz/${mockQuizId}/result/${mockSessionId}`)

    // Verify score and matrix
    await expect(page.getByText('10')).toBeVisible()
    await expect(page.getByText('XUẤT SẮC!')).toBeVisible()

    // Verify GuestClaimBanner is rendered
    const claimBannerText = page.getByText(/Lưu bài thi này vào Hồ sơ cá nhân\?/i)
    await expect(claimBannerText).toBeVisible()

    const claimPrompt = page.getByText(/Bạn đang xem với tư cách Khách/i)
    await expect(claimPrompt).toBeVisible()

    const claimBtn = page.getByRole('button', { name: /Đăng nhập để lưu kết quả/i })
    await expect(claimBtn).toBeVisible()

    // Click claim button when not logged in -> Redirects to login with callbackUrl
    await claimBtn.click()
    await expect(page).toHaveURL(/.*login.*callbackUrl=/)
  })
})
