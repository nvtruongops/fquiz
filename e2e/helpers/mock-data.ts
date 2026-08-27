import { Page } from '@playwright/test'

export interface MockQuizData {
  id: string
  title: string
  description?: string
  categoryName?: string
  course_code?: string
  questionCount?: number
  studentCount?: number
  createdAt?: string
}

export interface MockQuestionItem {
  _id: string
  question_id?: string
  text: string
  options: string[]
  correct_answer?: number | number[]
  explanation?: string
}

/**
 * Mock authenticated user session endpoint (/api/auth/me)
 */
export async function mockAuthUser(
  page: Page,
  user: {
    _id?: string
    name?: string
    email?: string
    role?: 'student' | 'teacher' | 'admin' | 'dev'
    avatarUrl?: string
  } | null = {
    _id: '507f1f77bcf86cd799439099',
    name: 'Sinh viên FQuiz',
    email: 'student@fquiz.vn',
    role: 'student',
  }
) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user }),
    })
  })
}

/**
 * Mock public quiz detail endpoint
 */
export async function mockPublicQuizDetail(page: Page, quiz: MockQuizData) {
  const payload = {
    data: {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description || 'Mô tả bộ đề thi mẫu FQuiz E2E',
      categoryName: quiz.categoryName || 'Công nghệ Thông tin',
      course_code: quiz.course_code || 'PRN211',
      questionCount: quiz.questionCount ?? 5,
      studentCount: quiz.studentCount ?? 12,
      createdAt: quiz.createdAt || new Date().toISOString(),
    },
  }

  await page.route(`**/api/v1/public/quizzes/${quiz.id}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })
  })

  await page.route(`**/api/student/quizzes/${quiz.id}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        quiz: {
          _id: quiz.id,
          title: quiz.title,
          description: quiz.description || 'Mô tả bộ đề thi mẫu FQuiz E2E',
          category_id: { name: quiz.categoryName || 'Công nghệ Thông tin' },
          course_code: quiz.course_code || 'PRN211',
          num_questions: quiz.questionCount ?? 5,
          num_attempts: quiz.studentCount ?? 12,
          created_at: quiz.createdAt || new Date().toISOString(),
        },
      }),
    })
  })
}

/**
 * Mock categories for explore and course listing
 */
export async function mockCategories(
  page: Page,
  categories = [
    { id: 'cat-prn211', name: 'PRN211', publishedQuizCount: 8 },
    { id: 'cat-dbs401', name: 'DBS401', publishedQuizCount: 5 },
    { id: 'cat-mln111', name: 'MLN111', publishedQuizCount: 12 },
    { id: 'cat-swp391', name: 'SWP391', publishedQuizCount: 3 },
  ]
) {
  await page.route('**/api/v1/public/categories', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: categories.map((c) => ({
          id: c.id,
          name: c.name,
          publishedQuizCount: c.publishedQuizCount,
        })),
      }),
    })
  })

  await page.route('**/api/student/pinned-categories', async (route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          pinned: true,
          pinnedCategories: [body.categoryId],
        }),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          pinnedCategories: ['cat-prn211'],
        }),
      })
    }
  })
}

/**
 * Mock active and completed session runner endpoints
 */
export async function mockQuizSession(
  page: Page,
  options: {
    quizId: string
    sessionId: string
    mode?: 'immediate' | 'review' | 'flashcard'
    questions: MockQuestionItem[]
    isGuest?: boolean
  }
) {
  const { quizId, sessionId, mode = 'immediate', questions, isGuest = false } = options

  // Mock session list/check
  await page.route('**/api/sessions?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ assessmentSession: null, learningSession: null }),
    })
  })

  // Mock create session POST
  await page.route('**/api/sessions', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId,
          mode,
          difficulty: 'sequential',
          isGuest,
        }),
      })
    } else {
      await route.fallback()
    }
  })

  // Mock session questions metadata
  await page.route(`**/api/sessions/${sessionId}/questions`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sessionId,
        mode,
        status: 'active',
        totalQuestions: questions.length,
        questions: questions.map((q) => ({
          _id: q._id,
          question_id: q.question_id || q._id,
          text: q.text,
          options: q.options,
        })),
      }),
    })
  })

  // Mock individual session state
  await page.route(`**/api/sessions/${sessionId}`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session: {
            _id: sessionId,
            quiz_id: quizId,
            mode,
            status: 'active',
            current_question_index: 0,
            totalQuestions: questions.length,
            user_answers: [],
            is_guest: isGuest,
          },
          question: {
            _id: questions[0]._id,
            text: questions[0].text,
            options: questions[0].options,
            correct_answer: questions[0].correct_answer ?? 0,
            explanation: questions[0].explanation,
          },
        }),
      })
    } else {
      await route.fallback()
    }
  })

  // Mock answer submit POST
  await page.route(`**/api/sessions/${sessionId}/answers`, async (route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}')
      const targetQuestion = questions[body.questionIndex] || questions[0]
      const isCorrect = Array.isArray(targetQuestion.correct_answer)
        ? targetQuestion.correct_answer.includes(body.selectedOptions?.[0] ?? body.answerIndex)
        : (targetQuestion.correct_answer ?? 0) === (body.selectedOptions?.[0] ?? body.answerIndex)

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          isCorrect,
          correctAnswers: Array.isArray(targetQuestion.correct_answer)
            ? targetQuestion.correct_answer
            : [targetQuestion.correct_answer ?? 0],
          explanation: targetQuestion.explanation || 'Giải thích chi tiết cho câu hỏi mẫu.',
          score: isCorrect ? 1 : 0,
          answeredCount: body.questionIndex + 1,
          totalQuestions: questions.length,
        }),
      })
    } else {
      await route.fallback()
    }
  })
}
