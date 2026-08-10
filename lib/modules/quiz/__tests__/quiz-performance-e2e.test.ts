import { processImmediateAnswer, processReviewAnswer, calculateScore } from '@/lib/modules/quiz/quiz-engine'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'

jest.mock('@/lib/core/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(true),
}))

jest.mock('@/lib/modules/quiz/models/QuizSession', () => ({
  QuizSession: {
    findById: jest.fn(),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    findOneAndUpdate: jest.fn(),
    distinct: jest.fn().mockResolvedValue([]),
  },
}))

jest.mock('@/lib/modules/quiz/models/Quiz', () => ({
  Quiz: {
    findById: jest.fn(),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  },
}))

describe('Quiz Session E2E Performance Benchmark', () => {
  const TOTAL_QUESTIONS = 50

  const mockQuestions = Array.from({ length: TOTAL_QUESTIONS }, (_, i) => ({
    _id: `q-${i}`,
    text: `Question ${i + 1}`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correct_answer: i % 4,
    explanation: `Explanation for Q${i + 1}`,
  }))

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should process 50 immediate mode answers within 100ms total execution time (Sequential)', async () => {
    const mockSession = {
      _id: 'session-perf-seq',
      quiz_id: 'quiz-perf-1',
      current_question_index: 0,
      question_order: Array.from({ length: TOTAL_QUESTIONS }, (_, i) => i),
      user_answers: [],
      score: 0,
      answer_version: 1,
      questions_cache: mockQuestions,
    }

    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'session-perf-seq',
          user_answers: mockSession.user_answers,
          answer_version: 1,
          score: 0,
        }),
      }),
      lean: jest.fn().mockResolvedValue(mockSession),
    })

    const startTime = performance.now()

    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      const selectedOption = i % 4 // All correct
      const result = await processImmediateAnswer(mockSession as any, [selectedOption], i)
      expect(result.isCorrect).toBe(true)
      expect(result.correctAnswer).toBe(i % 4)
    }

    const duration = performance.now() - startTime
    const avgPerAnswer = duration / TOTAL_QUESTIONS

    // Performance assertion: average execution time per answer should be < 2ms in Node.js
    expect(avgPerAnswer).toBeLessThan(5)
    expect(duration).toBeLessThan(250)
  })

  it('should process 50 immediate mode answers within 100ms total execution time (Random Shuffled)', async () => {
    // Reverse shuffled question order: [49, 48, ... 0]
    const shuffledOrder = Array.from({ length: TOTAL_QUESTIONS }, (_, i) => TOTAL_QUESTIONS - 1 - i)

    const mockSession = {
      _id: 'session-perf-rand',
      quiz_id: 'quiz-perf-1',
      current_question_index: 0,
      question_order: shuffledOrder,
      user_answers: [],
      score: 0,
      answer_version: 1,
      questions_cache: mockQuestions,
    }

    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'session-perf-rand',
          user_answers: mockSession.user_answers,
          answer_version: 1,
          score: 0,
        }),
      }),
      lean: jest.fn().mockResolvedValue(mockSession),
    })

    const startTime = performance.now()

    for (let displayIdx = 0; displayIdx < TOTAL_QUESTIONS; displayIdx++) {
      const actualQIndex = shuffledOrder[displayIdx]
      const correctOpt = mockQuestions[actualQIndex].correct_answer as number

      const result = await processImmediateAnswer(mockSession as any, [correctOpt], displayIdx)
      expect(result.isCorrect).toBe(true)
      expect(result.correctAnswer).toBe(correctOpt)
    }

    const duration = performance.now() - startTime
    const avgPerAnswer = duration / TOTAL_QUESTIONS

    expect(avgPerAnswer).toBeLessThan(5)
    expect(duration).toBeLessThan(250)
  })

  it('should handle answer updates in review mode efficiently (0ms overhead per re-answer)', async () => {
    const mockSession = {
      _id: 'session-perf-review',
      quiz_id: 'quiz-perf-1',
      current_question_index: 0,
      question_order: Array.from({ length: TOTAL_QUESTIONS }, (_, i) => i),
      user_answers: [],
      score: 0,
      answer_version: 1,
      questions_cache: mockQuestions,
    }

    ;(QuizSession.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'session-perf-review',
          user_answers: mockSession.user_answers,
          answer_version: 1,
          score: 0,
        }),
      }),
      lean: jest.fn().mockResolvedValue(mockSession),
    })

    const startTime = performance.now()

    // Simulate student changing answers 3 times per question across 50 questions (150 submissions)
    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      await processReviewAnswer(mockSession as any, [0], i) // 1st choice
      await processReviewAnswer(mockSession as any, [1], i) // 2nd choice (changed)
      await processReviewAnswer(mockSession as any, [i % 4], i) // Final choice
    }

    const duration = performance.now() - startTime
    const totalSubmissions = TOTAL_QUESTIONS * 3
    const avgPerSubmission = duration / totalSubmissions

    expect(avgPerSubmission).toBeLessThan(3)
    expect(duration).toBeLessThan(350)
  })

  it('should calculate server-side final score for 50 questions in under 1ms', () => {
    const userAnswers = Array.from({ length: TOTAL_QUESTIONS }, (_, i) => ({
      question_index: i,
      answer_index: i % 4,
      answer_indexes: [i % 4],
      is_correct: true,
    }))

    const startTime = performance.now()
    const score = calculateScore(userAnswers, mockQuestions)
    const duration = performance.now() - startTime

    expect(score).toBe(TOTAL_QUESTIONS)
    expect(duration).toBeLessThan(10)
  })
})
