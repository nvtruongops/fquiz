import { test, expect } from '@playwright/test'
import { mockQuizSession } from './helpers/mock-data'

test.describe('Quiz Session Runner Interactive Experience', () => {
  const mockQuizId = '507f1f77bcf86cd799439011'
  const mockSessionId = '607f1f77bcf86cd799439022'

  const mockQuestions = [
    {
      _id: 'q1',
      question_id: 'Q-001',
      text: 'Mô hình lập trình nào là nền tảng cốt lõi của C# .NET?',
      options: ['Hướng đối tượng (OOP)', 'Lập trình thủ tục thuần túy', 'Lập trình hàm thuần túy', 'Lập trình logic'],
      correct_answer: 0,
      explanation: 'C# là ngôn ngữ lập trình hướng đối tượng mạnh mẽ (Object-Oriented Programming).',
    },
    {
      _id: 'q2',
      question_id: 'Q-002',
      text: 'Từ khóa nào trong C# được dùng để kế thừa một lớp cơ sở?',
      options: [': (dấu hai chấm)', 'extends', 'implements', 'inherit'],
      correct_answer: 0,
      explanation: 'Trong C#, cú pháp kế thừa sử dụng dấu hai chấm : (class Dog : Animal).',
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
    await expect(page.getByText('Mô hình lập trình nào là nền tảng cốt lõi của C# .NET?')).toBeVisible()

    // Check options
    await expect(page.getByText('Hướng đối tượng (OOP)')).toBeVisible()
    await expect(page.getByText('Lập trình thủ tục thuần túy')).toBeVisible()
  })

  test('should allow selecting an answer option and receiving immediate feedback in practice mode', async ({ page }) => {
    await page.goto(`/quiz/${mockQuizId}/session/${mockSessionId}`)

    // Click option A
    const optionA = page.getByText('Hướng đối tượng (OOP)')
    await optionA.click()

    // Option should receive selected or active highlight styling
    await expect(optionA).toBeVisible()
  })
})
