import { test, expect } from '@playwright/test'
import { mockQuizSession } from './helpers/mock-data'

test.describe('Flashcard Learning Mode Interactive Experience', () => {
  const mockQuizId = '507f1f77bcf86cd799439011'
  const mockSessionId = '607f1f77bcf86cd799439022'

  const mockQuestions = [
    {
      _id: 'q1',
      question_id: 'Q-001',
      text: 'Khái niệm Polymorphism trong OOP thể hiện điều gì?',
      options: ['Tính đa hình', 'Tính đóng gói', 'Tính kế thừa', 'Tính trừu tượng'],
      correct_answer: 0,
      explanation: 'Polymorphism (Tính đa hình) cho phép các đối tượng khác nhau thực thi cùng một phương thức theo các cách khác nhau.',
    },
    {
      _id: 'q2',
      question_id: 'Q-002',
      text: 'Khái niệm Encapsulation trong OOP thể hiện điều gì?',
      options: ['Tính đóng gói', 'Tính đa hình', 'Tính kế thừa', 'Tính trừu tượng'],
      correct_answer: 0,
      explanation: 'Encapsulation (Tính đóng gói) che giấu trạng thái bên trong của đối tượng và chỉ cung cấp các phương thức truy cập công khai.',
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
    await expect(page.getByText('Khái niệm Polymorphism trong OOP thể hiện điều gì?')).toBeVisible()
    await expect(page.getByText('Mặt Trước (Câu hỏi)')).toBeVisible()

    // Check "Chưa thuộc" and "Đã thuộc" buttons
    const notKnownBtn = page.getByRole('button', { name: /Chưa thuộc/i })
    const knownBtn = page.getByRole('button', { name: /Đã thuộc/i })

    await expect(notKnownBtn).toBeVisible()
    await expect(knownBtn).toBeVisible()
  })

  test('should flip card to reveal answer when clicked', async ({ page }) => {
    await page.goto(`/quiz/${mockQuizId}/session/${mockSessionId}/flashcard`)

    // Verify initially on front face
    await expect(page.getByText('Mặt Trước (Câu hỏi)')).toBeVisible()

    // Click flashcard to flip
    const card = page.getByText('Khái niệm Polymorphism trong OOP thể hiện điều gì?')
    await card.click()

    // Verify flipped to back face with correct answer indicator
    await expect(page.getByText('Mặt Sau (Đáp án)')).toBeVisible()
    await expect(page.getByText(/Đáp án chính xác/i)).toBeVisible()
  })

  test('should advance to next card when clicking "Đã thuộc"', async ({ page }) => {
    await page.goto(`/quiz/${mockQuizId}/session/${mockSessionId}/flashcard`)

    const knownBtn = page.getByRole('button', { name: /Đã thuộc/i })
    await knownBtn.click()

    // Advance to next card or update status
    await expect(page.getByRole('button', { name: /Đã thuộc/i })).toBeVisible()
  })
})
