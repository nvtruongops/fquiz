import {
  syncUniqueStudentCount,
  processImmediateAnswer,
  processReviewAnswer,
  calculateScore,
  atomicCompleteSession,
} from '../quiz-engine'
import { Quiz } from '../models/Quiz'
import { QuizSession } from '../models/QuizSession'
import { connectDB } from '@/lib/core/db/mongodb'

// Mock dependencies
jest.mock('@/lib/core/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(null),
}))

jest.mock('../models/Quiz', () => ({
  Quiz: {
    findById: jest.fn(),
    updateOne: jest.fn(),
  },
}))

let mockSessionForFind: any = null

jest.mock('../models/QuizSession', () => ({
  QuizSession: {
    distinct: jest.fn(),
    findById: jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockImplementation(() => Promise.resolve(mockSessionForFind)),
    })),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  },
}))

describe('Quiz Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('syncUniqueStudentCount', () => {
    it('should query distinct student_id and update Quiz studentCount', async () => {
      const quizId = 'quiz-123'
      const mockStudents = ['student-1', 'student-2']
      ;(QuizSession.distinct as jest.Mock).mockResolvedValue(mockStudents)
      ;(Quiz.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 })

      await syncUniqueStudentCount(quizId)

      expect(QuizSession.distinct).toHaveBeenCalledWith('student_id', { quiz_id: quizId })
      expect(Quiz.updateOne).toHaveBeenCalledWith(
        { _id: quizId },
        { $set: { studentCount: 2 } }
      )
    })
  })

  describe('calculateScore', () => {
    const questions = [
      { _id: 'q1', text: 'Q1', options: ['A', 'B'], correct_answer: 0 },
      { _id: 'q2', text: 'Q2', options: ['C', 'D'], correct_answer: [1] },
      { _id: 'q3', text: 'Q3', options: ['E', 'F'], correct_answer: [0, 1] },
    ] as any[]

    it('should calculate score correctly for sequential questions', () => {
      const userAnswers = [
        { question_index: 0, answer_index: 0, answer_indexes: [0] }, // Correct
        { question_index: 1, answer_index: 0, answer_indexes: [0] }, // Incorrect (correct is 1)
        { question_index: 2, answer_index: 0, answer_indexes: [0, 1] }, // Correct
      ] as any[]

      const score = calculateScore(userAnswers, questions)
      expect(score).toBe(2)
    })

    it('should calculate score correctly with custom question order (shuffled)', () => {
      const questionOrder = [2, 0, 1] // index mapping: display 0 -> actual 2, display 1 -> actual 0, display 2 -> actual 1
      const userAnswers = [
        { question_index: 0, answer_index: 0, answer_indexes: [0, 1] }, // Actual index 2 (correct_answer: [0,1]) -> Correct
        { question_index: 1, answer_index: 0, answer_indexes: [0] }, // Actual index 0 (correct_answer: 0) -> Correct
        { question_index: 2, answer_index: 0, answer_indexes: [0] }, // Actual index 1 (correct_answer: [1]) -> Incorrect
      ] as any[]

      const score = calculateScore(userAnswers, questions, questionOrder)
      expect(score).toBe(2)
    })
  })

  describe('processImmediateAnswer', () => {
    let mockSession: any

    beforeEach(() => {
      mockSession = {
        _id: 'session-123',
        quiz_id: 'quiz-123',
        current_question_index: 0,
        question_order: [0, 1],
        user_answers: [],
        score: 0,
        answer_version: 1,
        questions_cache: [
          { _id: 'q1', text: 'Q1', options: ['A', 'B'], correct_answer: 0, explanation: 'Exp 1' },
          { _id: 'q2', text: 'Q2', options: ['C', 'D'], correct_answer: [1], explanation: 'Exp 2' },
        ],
      }
      mockSessionForFind = mockSession
    })

    it('should process a correct immediate answer and return feedback', async () => {
      const result = await processImmediateAnswer(mockSession, [0])

      expect(result.isCorrect).toBe(true)
      expect(result.correctAnswer).toBe(0)
      expect(result.explanation).toBe('Exp 1')

      expect(QuizSession.updateOne).toHaveBeenCalledWith(
        { _id: 'session-123', answer_version: 1 },
        expect.objectContaining({
          $set: expect.objectContaining({
            current_question_index: 1,
            score: 1,
          }),
          $inc: { answer_version: 1 },
        })
      )
    })

    it('should process an incorrect immediate answer and return feedback', async () => {
      const result = await processImmediateAnswer(mockSession, [1])

      expect(result.isCorrect).toBe(false)
      expect(result.correctAnswer).toBe(0)

      expect(QuizSession.updateOne).toHaveBeenCalledWith(
        { _id: 'session-123', answer_version: 1 },
        expect.objectContaining({
          $set: expect.objectContaining({
            current_question_index: 1,
            score: 0,
          }),
          $inc: { answer_version: 1 },
        })
      )
    })

    it('should handle session with missing answer_version (pre-deploy session)', async () => {
      const sessionWithoutVersion = {
        ...mockSession,
        answer_version: undefined,
      }
      mockSessionForFind = sessionWithoutVersion

      const result = await processImmediateAnswer(sessionWithoutVersion, [0])

      expect(result.isCorrect).toBe(true)
      expect(QuizSession.updateOne).toHaveBeenCalledWith(
        {
          _id: 'session-123',
          $or: [{ answer_version: 1 }, { answer_version: { $exists: false } }],
        },
        expect.objectContaining({
          $set: expect.objectContaining({
            current_question_index: 1,
            score: 1,
          }),
          $inc: { answer_version: 1 },
        })
      )
    })
  })

  describe('processReviewAnswer', () => {
    let mockSession: any

    beforeEach(() => {
      mockSession = {
        _id: 'session-123',
        quiz_id: 'quiz-123',
        current_question_index: 0,
        question_order: [0, 1],
        user_answers: [],
        score: 0,
        answer_version: 1,
        questions_cache: [
          { _id: 'q1', text: 'Q1', options: ['A', 'B'], correct_answer: 0, explanation: 'Exp 1' },
          { _id: 'q2', text: 'Q2', options: ['C', 'D'], correct_answer: [1], explanation: 'Exp 2' },
        ],
      }
      mockSessionForFind = mockSession
    })

    it('should save answer and return next question stripped of correct answer and explanation', async () => {
      const result = await processReviewAnswer(mockSession, [0])

      expect(result.nextQuestion).toBeDefined()
      expect((result.nextQuestion as any).correct_answer).toBeUndefined()
      expect((result.nextQuestion as any).explanation).toBeUndefined()
      expect(result.nextQuestion?.text).toBe('Q2')

      expect(QuizSession.updateOne).toHaveBeenCalledWith(
        { _id: 'session-123', answer_version: 1 },
        expect.objectContaining({
          $set: expect.objectContaining({
            current_question_index: 1,
          }),
          $inc: { answer_version: 1 },
        })
      )
    })

    it('should handle last question by returning completed: false and final score, without advancing index', async () => {
      mockSession.current_question_index = 1
      mockSession.user_answers = [
        { question_index: 0, answer_index: 0, answer_indexes: [0], is_correct: true },
      ]
      mockSession.score = 1

      const result = await processReviewAnswer(mockSession, [1]) // Correct for Q2

      expect(result.completed).toBe(false)
      expect(result.score).toBe(2)

      expect(QuizSession.updateOne).toHaveBeenCalledWith(
        { _id: 'session-123', answer_version: 1 },
        expect.objectContaining({
          $set: expect.objectContaining({
            current_question_index: 1,
            score: 2,
          }),
          $inc: { answer_version: 1 },
        })
      )
    })
  })

  describe('atomicCompleteSession', () => {
    it('should complete session and set final score if not already completed', async () => {
      const mockSession = {
        _id: 'session-123',
        quiz_id: 'quiz-123',
        status: 'active',
        question_order: [0, 1],
        questions_cache: [
          { _id: 'q1', text: 'Q1', options: ['A', 'B'], correct_answer: 0 },
          { _id: 'q2', text: 'Q2', options: ['C', 'D'], correct_answer: 1 },
        ],
        user_answers: [
          { question_index: 0, answer_index: 0, answer_indexes: [0] }, // Correct
          { question_index: 1, answer_index: 0, answer_indexes: [0] }, // Incorrect
        ],
      }

      ;(QuizSession.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSession),
      })
      ;(QuizSession.findOneAndUpdate as jest.Mock).mockResolvedValue({ _id: 'session-123', status: 'completed' })

      const completed = await atomicCompleteSession('session-123')

      expect(completed).toBe(true)
      expect(QuizSession.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'session-123', status: { $ne: 'completed' } },
        {
          $set: expect.objectContaining({
            status: 'completed',
            score: 1,
            current_question_index: 2,
          }),
          $unset: { expires_at: 1 },
        },
        { new: true }
      )
    })

    it('should return false if session is already completed in database', async () => {
      const mockSession = {
        _id: 'session-123',
        status: 'completed',
      }
      ;(QuizSession.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSession),
      })

      const completed = await atomicCompleteSession('session-123')
      expect(completed).toBe(false)
      expect(QuizSession.findOneAndUpdate).not.toHaveBeenCalled()
    })
  })
})
