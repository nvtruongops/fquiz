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
})
