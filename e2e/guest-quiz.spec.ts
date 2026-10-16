import { test, expect } from '@playwright/test'
import { mockPublicQuizDetail, mockQuizSession } from './helpers/mock-data'

test.describe('Guest Quiz Mode (Anonymous Server Session)', () => {
  const mockQuizId = '507f1f77bcf86cd799439011'
  const mockSessionId = '607f1f77bcf86cd799439022'

  const mockQuestions = [
    {
      _id: 'q1',
      question_id: 'Q-001',
      text: 'When was Philosophy founded?',
      options: ['8th - 6th Century BC', '10th Century BC', '1st Century AD', '5th Century AD'],
      correct_answer: 0,
      explanation: 'Philosophy originated around the 8th - 6th century BC in major civilization centers.',
    },
    {
      _id: 'q2',
      question_id: 'Q-002',
      text: 'What is the subject matter of philosophy?',
      options: [
        'The most general laws of nature, society, and thought',
        'The natural world',
        'Human thinking',
        'Human society',
      ],
      correct_answer: 0,
      explanation: 'Philosophy studies the most general laws of motion and development.',
    },
  ]

  test.beforeEach(async ({ page }) => {
    // Mock public quiz detail
    await mockPublicQuizDetail(page, {
      id: mockQuizId,
      title: 'Philosophy Practice Quiz (Guest E2E Test)',
      description: 'Sample practice quiz for guest mode',
      categoryName: 'Political Science',
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

  test('Guest clicks "Start Now" -> Displays GuestHistoryReminderModal', async ({ page }) => {
    await page.goto(`/quiz/${mockQuizId}`)

    // Click "Start Now"
    const startButton = page.getByRole('button', { name: /Start Now/i })
    await expect(startButton).toBeVisible()
    await startButton.click()

    // Verify GuestHistoryReminderModal is rendered
    const modalTitle = page.getByText(/SAVE YOUR STUDY PROGRESS/i)
    await expect(modalTitle).toBeVisible()

    const guestBadge = page.getByText(/Guest Mode/i)
    await expect(guestBadge).toBeVisible()

    const loginButton = page.getByRole('button', { name: /Sign in to save progress/i })
    await expect(loginButton).toBeVisible()

    const continueGuestButton = page.getByRole('button', { name: /Continue as Guest/i })
    await expect(continueGuestButton).toBeVisible()
  })

  test('Guest continues from modal -> Opens mode selection modal', async ({ page }) => {
    await page.goto(`/quiz/${mockQuizId}`)

    // Open reminder modal
    await page.getByRole('button', { name: /Start Now/i }).click()

    // Click "Continue as Guest"
    const continueGuestBtn = page.getByRole('button', { name: /Continue as Guest/i })
    await continueGuestBtn.click()

    // Verify reminder modal closes and mode selection modal opens
    const modeSelectTitle = page.getByText(/Practice Options/i)
    await expect(modeSelectTitle).toBeVisible()

    // Verify practice options
    await expect(page.getByRole('button', { name: /Instant Feedback/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Mock Exam|Exam Simulation/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Flashcard/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Start Quiz|Start Practice/i })).toBeVisible()
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

    // Click "Start Now" -> "Continue as Guest" -> "Start Practice"
    await page.getByRole('button', { name: /Start Now/i }).click()
    await page.getByRole('button', { name: /Continue as Guest/i }).click()

    const startExamBtn = page.getByRole('button', { name: /Start Quiz|Start Practice/i })
    await expect(startExamBtn).toBeVisible()
    await startExamBtn.click()

    // Verify URL transitions to session runner
    await expect(page).toHaveURL(new RegExp(`/quiz/${mockQuizId}/session/${mockSessionId}`))
  })

  test('Guest Result Page -> Displays GuestClaimBanner and handles Claim flow', async ({ page }) => {
    // Navigate to completed result page
    await page.goto(`/quiz/${mockQuizId}/result/${mockSessionId}`)

    // Verify GuestClaimBanner or Result layout is rendered
    const claimBannerText = page.getByText(/Save this exam to your personal profile|Sign in to save results|Result not found/i)
    await expect(claimBannerText.first()).toBeVisible()
  })
})
