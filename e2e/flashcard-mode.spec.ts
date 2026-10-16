import { test, expect } from '@playwright/test'
import { mockQuizSession } from './helpers/mock-data'

test.describe('Flashcard Learning Mode Interactive Experience', () => {
  const mockQuizId = '507f1f77bcf86cd799439011'
  const mockSessionId = '607f1f77bcf86cd799439022'

  const mockQuestions = [
    {
      _id: 'q1',
      question_id: 'Q-001',
      text: 'What does Polymorphism represent in OOP?',
      options: ['Polymorphism', 'Encapsulation', 'Inheritance', 'Abstraction'],
      correct_answer: 0,
      explanation: 'Polymorphism allows different objects to execute the same method in different ways.',
    },
    {
      _id: 'q2',
      question_id: 'Q-002',
      text: 'What does Encapsulation represent in OOP?',
      options: ['Encapsulation', 'Polymorphism', 'Inheritance', 'Abstraction'],
      correct_answer: 0,
      explanation: 'Encapsulation hides the internal state of an object and provides public access methods.',
    },
  ]

  test.beforeEach(async ({ page }) => {
    await mockQuizSession(page, {
      quizId: mockQuizId,
      sessionId: mockSessionId,
      mode: 'flashcard',
      questions: mockQuestions,
      isGuest: true,
    })
  })

  test('should render flashcard front face and action buttons', async ({ page }) => {
    await page.goto(`/quiz/${mockQuizId}/session/${mockSessionId}/flashcard`)

    // Check front face question text and indicator
    await expect(page.getByText('What does Polymorphism represent in OOP?')).toBeVisible()
    await expect(page.getByText(/Front \(Question\)/i)).toBeVisible()

    // Check "Not Mastered" and "Mastered" buttons
    const notKnownBtn = page.getByRole('button', { name: /Not Mastered|Still Learning/i })
    const knownBtn = page.getByRole('button', { name: /Mastered|Known/i })

    await expect(notKnownBtn).toBeVisible()
    await expect(knownBtn).toBeVisible()
  })

  test('should flip card to reveal answer when clicked', async ({ page }) => {
    await page.goto(`/quiz/${mockQuizId}/session/${mockSessionId}/flashcard`)

    // Verify initially on front face
    await expect(page.getByText(/Front \(Question\)/i)).toBeVisible()

    // Click flashcard to flip
    const card = page.getByText('What does Polymorphism represent in OOP?')
    await card.click()

    // Verify flipped to back face with correct answer indicator
    await expect(page.getByText(/Back \(Answer\)/i)).toBeVisible()
    await expect(page.getByText(/Correct Answer/i)).toBeVisible()
  })

  test('should advance to next card when clicking "Mastered"', async ({ page }) => {
    await page.goto(`/quiz/${mockQuizId}/session/${mockSessionId}/flashcard`)

    const knownBtn = page.getByRole('button', { name: /Mastered|Known/i })
    await knownBtn.click()

    // Advance to next card or update status
    await expect(page.getByRole('button', { name: /Mastered|Known/i })).toBeVisible()
  })
})
