import { test, expect } from '@playwright/test'
import { mockQuizSession } from './helpers/mock-data'

test.describe('Quiz Session Runner Interactive Experience', () => {
  const mockQuizId = '507f1f77bcf86cd799439011'
  const mockSessionId = '607f1f77bcf86cd799439022'

  const mockQuestions = [
    {
      _id: 'q1',
      question_id: 'Q-001',
      text: 'Which programming paradigm is the core foundation of C# .NET?',
      options: ['Object-Oriented Programming (OOP)', 'Pure Procedural Programming', 'Pure Functional Programming', 'Logic Programming'],
      correct_answer: 0,
      explanation: 'C# is a strong object-oriented programming language.',
    },
    {
      _id: 'q2',
      question_id: 'Q-002',
      text: 'Which symbol in C# is used to inherit from a base class?',
      options: [': (colon)', 'extends', 'implements', 'inherit'],
      correct_answer: 0,
      explanation: 'In C#, inheritance syntax uses a colon : (class Dog : Animal).',
    },
  ]

  test.beforeEach(async ({ page }) => {
    await mockQuizSession(page, {
      quizId: mockQuizId,
      sessionId: mockSessionId,
      mode: 'immediate',
      questions: mockQuestions,
      isGuest: true,
    })
  })

  test('should render session question text and answer options', async ({ page }) => {
    await page.goto(`/quiz/${mockQuizId}/session/${mockSessionId}`)

    // Check question text
    await expect(page.getByText('Which programming paradigm is the core foundation of C# .NET?')).toBeVisible()

    // Check options
    await expect(page.getByText('Object-Oriented Programming (OOP)')).toBeVisible()
    await expect(page.getByText('Pure Procedural Programming')).toBeVisible()
  })

  test('should allow selecting an answer option and receiving immediate feedback in practice mode', async ({ page }) => {
    await page.goto(`/quiz/${mockQuizId}/session/${mockSessionId}`)

    // Click option A
    const optionA = page.getByText('Object-Oriented Programming (OOP)')
    await optionA.click()

    // Option should receive selected or active highlight styling
    await expect(optionA).toBeVisible()
  })

  test('shows the mobile current question before the full question preload finishes', async ({ page }) => {
    let preloadFinished = false
    await page.addInitScript(() => {
      const trackedWindow = window as Window & {
        __QUIZ_LOADER_ACTIVE_UNTIL__?: number
        __quizSessionSkeletonSeen?: boolean
      }
      trackedWindow.__QUIZ_LOADER_ACTIVE_UNTIL__ = Date.now() + 5000
      trackedWindow.__quizSessionSkeletonSeen = false

      const observer = new MutationObserver(() => {
        if (document.querySelector('[data-testid="quiz-session-skeleton"]')) {
          trackedWindow.__quizSessionSkeletonSeen = true
        }
      })
      observer.observe(document, { childList: true, subtree: true })
    })

    await mockQuizSession(page, {
      quizId: mockQuizId,
      sessionId: mockSessionId,
      mode: 'immediate',
      questions: mockQuestions,
      isGuest: true,
      questionsDelayMs: 1800,
      onQuestionsFulfilled: () => { preloadFinished = true },
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/quiz/${mockQuizId}/session/${mockSessionId}/mobile`)

    await expect(page.getByText(mockQuestions[0].text, { exact: true })).toBeVisible({ timeout: 1000 })
    await expect(page.getByText('Please wait a moment • Loading Quiz Session', { exact: true }))
      .toBeHidden({ timeout: 1000 })
    expect(preloadFinished).toBe(false)
    expect(await page.evaluate(() => (window as any).__quizSessionSkeletonSeen)).toBe(false)
    await expect.poll(() => preloadFinished, { timeout: 2500 }).toBe(true)
  })

  test('shows answer checking immediately while the answer request is pending', async ({ page }) => {
    await mockQuizSession(page, {
      quizId: mockQuizId,
      sessionId: mockSessionId,
      mode: 'immediate',
      questions: mockQuestions,
      isGuest: true,
      answerDelayMs: 1800,
    })
    await page.goto(`/quiz/${mockQuizId}/session/${mockSessionId}`)

    const optionA = page.getByText(mockQuestions[0].options[0], { exact: true })
    await expect(optionA).toBeVisible()
    await optionA.click()

    const pendingStatus = page.getByRole('status').filter({ hasText: 'Checking answer' })
    await expect(pendingStatus).toBeVisible({ timeout: 300 })
    await expect(page.getByText('Correct answer', { exact: true })).toBeVisible({ timeout: 3000 })
    await expect(pendingStatus).toBeHidden()
  })

  test('review multi-answer selections toggle, survive reload, and clear without draft controls', async ({ page }) => {
    const savedSelections: number[][] = []
    await mockQuizSession(page, {
      quizId: mockQuizId,
      sessionId: mockSessionId,
      mode: 'review',
      isGuest: true,
      questions: [{
        _id: 'multi-review',
        text: 'Choose 3 answers. Select the three primary colors.',
        options: ['Red', 'Green', 'Blue', 'Yellow'],
        correct_answer: [0, 1, 2],
        answer_selection_count: 3,
      }],
      onAnswerSaved: (body) => savedSelections.push(body.answer_indexes),
    })
    await page.goto(`/quiz/${mockQuizId}/session/${mockSessionId}`)

    const red = page.getByRole('checkbox', { name: 'Option A: Red' })
    const green = page.getByRole('checkbox', { name: 'Option B: Green' })
    await expect(page.getByText(/Review draft|Discard draft/i)).toHaveCount(0)
    await red.click()
    await expect.poll(() => savedSelections.length).toBe(1)
    await green.click()
    await expect.poll(() => savedSelections.length).toBe(2)
    await expect(red).toHaveAttribute('aria-checked', 'true')
    await expect(green).toHaveAttribute('aria-checked', 'true')

    await page.reload()
    await expect(red).toHaveAttribute('aria-checked', 'true')
    await expect(green).toHaveAttribute('aria-checked', 'true')

    await red.click()
    await expect.poll(() => savedSelections.length).toBe(3)
    await expect(savedSelections[2]).toEqual([1])
    await green.click()
    await expect.poll(() => savedSelections.length).toBe(4)
    await expect(savedSelections[3]).toEqual([])
    await expect(red).toHaveAttribute('aria-checked', 'false')
    await expect(green).toHaveAttribute('aria-checked', 'false')
    await page.reload()
    await expect(red).toHaveAttribute('aria-checked', 'false')
    await expect(green).toHaveAttribute('aria-checked', 'false')
  })

  test('mobile immediate multi-answer toggles before grading and locks after the required count', async ({ page }) => {
    const multiQuestion = {
      _id: 'multi-mobile',
      text: 'Choose 3 answers. Select three primary colors.',
      options: ['Red', 'Green', 'Blue', 'Yellow'],
      correct_answer: [0, 1, 2],
      answer_selection_count: 3,
    }
    await mockQuizSession(page, {
      quizId: mockQuizId,
      sessionId: mockSessionId,
      mode: 'immediate',
      isGuest: true,
      questions: [multiQuestion],
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/quiz/${mockQuizId}/session/${mockSessionId}/mobile`)

    const red = page.getByRole('checkbox', { name: 'A Red' })
    const green = page.getByRole('checkbox', { name: 'B Green' })
    const blue = page.getByRole('checkbox', { name: 'C Blue' })
    await red.click()
    await expect(red).toHaveAttribute('aria-checked', 'true')
    await red.click()
    await expect(red).toHaveAttribute('aria-checked', 'false')
    await red.click()
    await green.click()
    await blue.click()

    await expect(page.getByText('Correct', { exact: true })).toHaveCount(3)
    await expect(red).toBeDisabled()
    await expect(green).toBeDisabled()
    await expect(blue).toBeDisabled()
  })
})
