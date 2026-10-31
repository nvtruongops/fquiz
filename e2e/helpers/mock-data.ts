import { Page, Route } from '@playwright/test'

type MockAnswerRequest = { question_index?: number; answer_indexes?: number[]; answer_index?: number; answer_revision?: number }

function getSubmittedAnswerIndexes(body: MockAnswerRequest): number[] {
  if (Array.isArray(body.answer_indexes)) return body.answer_indexes
  return typeof body.answer_index === 'number' ? [body.answer_index] : []
}

function areSubmittedAnswersCorrect(question: MockQuestionItem, submitted: number[]): boolean {
  const correct = Array.isArray(question.correct_answer) ? question.correct_answer : [question.correct_answer ?? 0]
  if (Array.isArray(question.correct_answer)) {
    return JSON.stringify([...submitted].sort()) === JSON.stringify([...correct].sort())
  }
  return (question.correct_answer ?? 0) === submitted[0]
}

async function fulfillReviewAnswer(
  route: Route,
  body: MockAnswerRequest,
  questionIndex: number,
  submittedIndexes: number[],
  onAnswerSaved: ((body: MockAnswerRequest & { question_index: number; answer_indexes: number[] }) => void) | undefined,
  saveAnswer: (answer: { question_index: number; answer_index: number; answer_indexes: number[] } | null) => void,
) {
  const normalizedBody = { ...body, question_index: questionIndex, answer_indexes: submittedIndexes }
  onAnswerSaved?.(normalizedBody)
  saveAnswer(submittedIndexes.length > 0
    ? { question_index: questionIndex, answer_index: submittedIndexes[0], answer_indexes: submittedIndexes }
    : null)
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ answerIndexes: submittedIndexes, answerRevision: body.answer_revision }),
  })
}

async function fulfillImmediateAnswer(route: Route, question: MockQuestionItem, submittedIndexes: number[], questionIndex: number, totalQuestions: number) {
  const correctAnswers = Array.isArray(question.correct_answer) ? question.correct_answer : [question.correct_answer ?? 0]
  const isCorrect = areSubmittedAnswersCorrect(question, submittedIndexes)
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      isCorrect,
      answerIndexes: submittedIndexes,
      correctAnswer: correctAnswers[0],
      correctAnswers,
      explanation: question.explanation || 'Detailed explanation for sample question.',
      score: isCorrect ? 1 : 0,
      answeredCount: questionIndex + 1,
      totalQuestions,
    }),
  })
}

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
  answer_selection_count?: number
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
    name: 'FQuiz Student',
    email: 'student@example.test',
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
      description: quiz.description || 'Sample FQuiz E2E quiz description',
      categoryName: quiz.categoryName || 'Information Technology',
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
          description: quiz.description || 'Sample FQuiz E2E quiz description',
          category_id: { name: quiz.categoryName || 'Information Technology' },
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
    questionsDelayMs?: number
    answerDelayMs?: number
    onQuestionsFulfilled?: () => void
    onAnswerSaved?: (body: MockAnswerRequest & { question_index: number; answer_indexes: number[] }) => void
  }
) {
  const {
    quizId,
    sessionId,
    mode = 'immediate',
    questions,
    isGuest = false,
    questionsDelayMs = 0,
    answerDelayMs = 0,
    onQuestionsFulfilled,
    onAnswerSaved,
  } = options
  let savedAnswer: { question_index: number; answer_index: number; answer_indexes: number[] } | null = null

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
    if (questionsDelayMs > 0) await page.waitForTimeout(questionsDelayMs)
    onQuestionsFulfilled?.()
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
          answer_selection_count: q.answer_selection_count,
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
            user_answers: savedAnswer ? [savedAnswer] : [],
            is_guest: isGuest,
          },
          question: {
            _id: questions[0]._id,
            text: questions[0].text,
            options: questions[0].options,
            correct_answer: questions[0].correct_answer ?? 0,
            answer_selection_count: questions[0].answer_selection_count,
            explanation: questions[0].explanation,
          },
        }),
      })
    } else {
      await route.fallback()
    }
  })

  // Mock answer submit POST
  await page.route(`**/api/sessions/${sessionId}/answer`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }

    const body = JSON.parse(route.request().postData() || '{}') as MockAnswerRequest
    const questionIndex = body.question_index ?? 0
    const targetQuestion = questions[questionIndex] || questions[0]
    const submittedIndexes = getSubmittedAnswerIndexes(body)
    if (answerDelayMs > 0) await page.waitForTimeout(answerDelayMs)

    if (mode === 'review') {
      await fulfillReviewAnswer(route, body, questionIndex, submittedIndexes, onAnswerSaved, (answer) => { savedAnswer = answer })
      return
    }
    await fulfillImmediateAnswer(route, targetQuestion, submittedIndexes, questionIndex, questions.length)
  })
}
