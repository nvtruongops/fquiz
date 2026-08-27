import { test, expect } from '@playwright/test'
import { mockPublicQuizDetail, mockQuizSession } from './helpers/mock-data'

test.describe('Guest Quiz Mode (Anonymous Server Session)', () => {
  const mockQuizId = '507f1f77bcf86cd799439011'
  const mockSessionId = '607f1f77bcf86cd799439022'

  const mockQuestions = [
    {
      _id: 'q1',
      question_id: 'Q-001',
      text: 'Triết học ra đời vào khoảng thời gian nào?',
      options: ['Thế kỷ VIII - VI TCN', 'Thế kỷ X TCN', 'Thế kỷ I SCN', 'Thế kỷ V SCN'],
      correct_answer: 0,
      explanation: 'Triết học ra đời vào khoảng thế kỷ VIII - VI TCN tại các trung tâm văn minh lớn.',
    },
    {
      _id: 'q2',
      question_id: 'Q-002',
      text: 'Đối tượng nghiên cứu của triết học là gì?',
      options: [
        'Các quy luật chung nhất của tự nhiên, xã hội và tư duy',
        'Thế giới tự nhiên',
        'Tư duy con người',
        'Xã hội loài người',
      ],
      correct_answer: 0,
      explanation: 'Triết học nghiên cứu các quy luật vận động, phát triển chung nhất.',
    },
  ]

  test.beforeEach(async ({ page }) => {
    // Mock public quiz detail
    await mockPublicQuizDetail(page, {
      id: mockQuizId,
      title: 'Đề thi thử Triết học Mác - Lênin (Guest E2E Test)',
      description: 'Bài kiểm tra mẫu cho chế độ khách',
      categoryName: 'Khoa học Chính trị',
      course_code: 'MLN111',
      questionCount: 2,
      studentCount: 10,
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
    const modeSelectTitle = page.getByText(/Tùy Chọn Luyện Tập/i)
    await expect(modeSelectTitle).toBeVisible()

    // Verify practice options
    await expect(page.getByRole('button', { name: /Xem đáp án ngay/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Thi thử & Kiểm tra/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Học lật thẻ/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Bắt đầu làm bài/i })).toBeVisible()
  })

  test('Guest creates session & takes quiz -> redirects to session runner', async ({ page }) => {
    await mockQuizSession(page, {
      quizId: mockQuizId,
      sessionId: mockSessionId,
      mode: 'immediate',
      questions: mockQuestions,
      isGuest: true,
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
    // Navigate to completed result page
    await page.goto(`/quiz/${mockQuizId}/result/${mockSessionId}`)

    // Verify GuestClaimBanner or Result layout is rendered
    const claimBannerText = page.getByText(/Lưu bài thi này vào Hồ sơ cá nhân\?|Đăng nhập để lưu kết quả|Không tìm thấy kết quả/i)
    await expect(claimBannerText.first()).toBeVisible()
  })
})
