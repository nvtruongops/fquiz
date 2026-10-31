import {
  syncUniqueStudentCount,
  processImmediateAnswer,
  processReviewAnswer,
  getImmediateAnswerResult,
  calculateScore,
  atomicCompleteSession,
} from '../quiz-engine'
import { Quiz } from '../models/Quiz'
import { QuizSession } from '../models/QuizSession'

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
    aggregate: jest.fn(),
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

function answerWriteFilter(versionFilter: Record<string, unknown>) {
  return expect.objectContaining({
    $and: expect.arrayContaining([
      { _id: 'session-123' },
      expect.objectContaining({
        status: 'active',
        $or: expect.arrayContaining([
          { expires_at: null },
          { expires_at: { $gt: expect.any(Date) } },
        ]),
      }),
      versionFilter,
    ]),
  })
}

describe('Quiz Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(QuizSession.findById as jest.Mock).mockImplementation(() => ({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockImplementation(() => Promise.resolve(mockSessionForFind)) }))
    ;(QuizSession.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 })
  })

  describe('getImmediateAnswerResult', () => {
    it('should return answer result read-only without calling updateOne', async () => {
      const mockSession = {
        _id: 'session-123',
        quiz_id: 'quiz-123',
        current_question_index: 0,
        question_order: [0],
        user_answers: [{ question_index: 0, answer_index: 0, is_correct: true }],
        questions_cache: [
          { _id: 'q1', text: 'Q1', options: ['A', 'B'], correct_answer: 0, explanation: 'Exp 1' },
        ],
      }

      const result = await getImmediateAnswerResult(mockSession as any, 0)
      expect(result.isCorrect).toBe(true)
      expect(result.correctAnswer).toBe(0)
      expect(result.explanation).toBe('Exp 1')
      expect(QuizSession.updateOne).not.toHaveBeenCalled()
    })
  })

  it('atomically clears a review answer under answer_version and active guards', async () => {
    const session = {
      _id: 'session-123', mode: 'review', status: 'active', answer_version: 4,
      question_order: [0], current_question_index: 0, score: 1,
      user_answers: [{ question_index: 0, answer_index: 0, answer_indexes: [0, 1], is_correct: true }],
      questions_cache: [{ _id: 'q1', text: 'Choose 2', options: ['A', 'B'], correct_answer: [0, 1] }],
    }
    const result = await processReviewAnswer(session as any, [], 0)
    expect(QuizSession.updateOne).toHaveBeenCalledWith(answerWriteFilter({ answer_version: 4 }), expect.objectContaining({
      $set: expect.objectContaining({ user_answers: [] }), $inc: { answer_version: 1 },
    }))
    expect(result).toEqual(expect.objectContaining({ answerIndexes: [] }))
  })

  it('recomputes final score if an answer clears between the finalization read and write', async () => {
    const first = { _id: 'session-123', status: 'active', answer_version: 1, question_order: [0],
      questions_cache: [{ _id: 'q1', text: 'Q', options: ['A', 'B'], correct_answer: [0, 1] }],
      user_answers: [{ question_index: 0, answer_index: 0, answer_indexes: [0, 1] }] }
    ;(QuizSession.findById as jest.Mock)
      .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(first) })
      .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue({ ...first, answer_version: 2, user_answers: [] }) })
    ;(QuizSession.findOneAndUpdate as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: 'session-123', status: 'completed', score: 0 })
    await expect(atomicCompleteSession('session-123')).resolves.toBe(true)
    expect(QuizSession.findOneAndUpdate).toHaveBeenNthCalledWith(2,
      { _id: 'session-123', status: { $ne: 'completed' }, answer_version: 2 },
      expect.objectContaining({ $set: expect.objectContaining({ score: 0 }) }), { new: true })
  })

  describe('review answer intent revisions', () => {
    let state: any
    let snapshot: any
    const review = processReviewAnswer as any
    beforeEach(() => {
      state = { _id: 'session-123', mode: 'review', status: 'active', answer_version: 1,
        question_order: [0], current_question_index: 0, user_answers: [], score: 0,
        questions_cache: [{ _id: 'q1', text: 'Choose 2', options: ['A', 'B'], correct_answer: [0, 1] }] }
      snapshot = { ...state }
      ;(QuizSession.findById as jest.Mock).mockImplementation(() => ({ select: jest.fn().mockReturnThis(), lean: async () => state }))
      ;(QuizSession.updateOne as jest.Mock).mockImplementation(async (filter, update) => {
        const version = filter.$and.find((part: any) => 'answer_version' in part)?.answer_version
        if (version !== state.answer_version || state.status === 'completed') return { modifiedCount: 0 }
        const next = { ...state, answer_version: state.answer_version + 1, ...update.$set }
        for (const [path, value] of Object.entries(update.$set)) {
          if (path.startsWith('answer_revisions.')) next.answer_revisions = { ...state.answer_revisions, [path.split('.')[1]]: value }
        }
        state = next
        return { modifiedCount: 1 }
      })
    })

    it('keeps an acknowledged clear when an in-flight older request retries after reload', async () => {
      let releaseOld!: () => void
      let oldStarted!: () => void
      const started = new Promise<void>((resolve) => { oldStarted = resolve })
      const gate = new Promise<void>((resolve) => { releaseOld = resolve })
      const persist = (QuizSession.updateOne as jest.Mock).getMockImplementation()!
      ;(QuizSession.updateOne as jest.Mock).mockImplementationOnce(async (filter, update) => {
        oldStarted()
        await gate
        return persist(filter, update)
      })
      const oldRequest = review(snapshot, [0, 1], 0, 1)
      await started
      await review(snapshot, [], 0, 2)
      releaseOld()
      await expect(oldRequest).rejects.toMatchObject({ code: 'ANSWER_CONFLICT' })
      expect(state.user_answers).toEqual([])
      expect(state.answer_revisions).toEqual({ 0: 2 })
      expect(state.answer_version).toBe(2)
      expect(QuizSession.updateOne).toHaveBeenCalledWith(expect.objectContaining({ $and: expect.arrayContaining([
        { $or: [{ 'answer_revisions.0': { $exists: false } }, { 'answer_revisions.0': { $lt: 2 } }] },
      ]) }), expect.objectContaining({ $set: expect.objectContaining({ 'answer_revisions.0': 2, user_answers: [] }) }))
    })

    it('acknowledges an identical revision retry without another write, including clear tombstones', async () => {
      await review(snapshot, [], 0, 2)
      const writes = (QuizSession.updateOne as jest.Mock).mock.calls.length
      expect(await review(state, [], 0, 2)).toMatchObject({ answerIndexes: [], answerRevision: 2 })
      expect(QuizSession.updateOne).toHaveBeenCalledTimes(writes)
      await expect(review(state, [0], 0, 2)).rejects.toMatchObject({ code: 'ANSWER_CONFLICT' })
      expect(state.user_answers).toEqual([])
    })

    it('blocks revisionless legacy requests once a revision tombstone exists', async () => {
      await review(snapshot, [], 0, 2)
      await expect(review(state, [0], 0)).rejects.toMatchObject({ code: 'ANSWER_CONFLICT' })
      expect(state.user_answers).toEqual([])
    })

    it('never exposes review correctness or score before completion even on the last question', async () => {
      const correct = await review(snapshot, [0, 1], 0, 1)
      const wrong = await review(state, [0], 0, 2)
      for (const response of [correct, wrong]) {
        expect(response).not.toHaveProperty('score')
        expect(response).not.toHaveProperty('isCorrect')
        expect(response).not.toHaveProperty('correctAnswer')
        expect(response).not.toHaveProperty('correctAnswers')
      }
    })
  })

  describe('syncUniqueStudentCount', () => {
    it('should aggregate unique students and guests and update Quiz studentCount', async () => {
      const quizId = 'quiz-123'
      ;(QuizSession.aggregate as jest.Mock).mockResolvedValue([{ total: 3 }])
      ;(Quiz.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 })

      await syncUniqueStudentCount(quizId)

      expect(QuizSession.aggregate).toHaveBeenCalled()
      expect(Quiz.updateOne).toHaveBeenCalledWith(
        { _id: quizId },
        { $set: { studentCount: 3 } }
      )
    })
  })

  describe('calculateScore', () => {
    const questions = [
      { _id: 'q1', text: 'Q1', options: ['A', 'B'], correct_answer: 0 },
      { _id: 'q2', text: 'Q2', options: ['C', 'D'], correct_answer: [1] },
      { _id: 'q3', text: 'Q3', options: ['E', 'F'], correct_answer: [0, 1] },
    ] as any[]

    it('does not score a stale scalar when an explicit empty set is present', () => {
      expect(calculateScore([{ question_index: 0, answer_index: 0, answer_indexes: [] }] as any, questions)).toBe(0)
    })

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
        answerWriteFilter({ answer_version: 1 }),
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
        answerWriteFilter({ answer_version: 1 }),
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
        answerWriteFilter({ answer_version: { $exists: false } }),
        expect.objectContaining({
          $set: expect.objectContaining({
            current_question_index: 1,
            score: 1,
          }),
          $inc: { answer_version: 1 },
        })
      )
    })

    it('should process immediate mode with sequential difficulty (default order)', async () => {
      const sequentialSession = {
        ...mockSession,
        difficulty: 'sequential',
        question_order: [0, 1],
      }
      mockSessionForFind = sequentialSession

      const resultQ0 = await processImmediateAnswer(sequentialSession, [0], 0)
      expect(resultQ0.isCorrect).toBe(true)
      expect(resultQ0.correctAnswer).toBe(0)
      expect(resultQ0.explanation).toBe('Exp 1')

      const resultQ1 = await processImmediateAnswer(sequentialSession, [1], 1)
      expect(resultQ1.isCorrect).toBe(true)
      expect(resultQ1.correctAnswer).toBe(1)
      expect(resultQ1.explanation).toBe('Exp 2')
    })

    it('should process immediate mode with random difficulty (shuffled order)', async () => {
      // Question order [1, 0] means display index 0 maps to actual Q2 ({ correct_answer: [1] })
      // and display index 1 maps to actual Q1 ({ correct_answer: 0 })
      const randomSession = {
        ...mockSession,
        difficulty: 'random',
        question_order: [1, 0],
      }
      mockSessionForFind = randomSession

      // Answer display index 0 (which points to actual Q2 with correct_answer [1])
      const resultDisplay0 = await processImmediateAnswer(randomSession, [1], 0)
      expect(resultDisplay0.isCorrect).toBe(true)
      expect(resultDisplay0.correctAnswer).toBe(1)
      expect(resultDisplay0.explanation).toBe('Exp 2')

      // Answer display index 1 (which points to actual Q1 with correct_answer 0)
      const resultDisplay1 = await processImmediateAnswer(randomSession, [0], 1)
      expect(resultDisplay1.isCorrect).toBe(true)
      expect(resultDisplay1.correctAnswer).toBe(0)
      expect(resultDisplay1.explanation).toBe('Exp 1')
    })

    it('should enforce OCC concurrency control when answer_version changes during submit', async () => {
      let callCount = 0
      ;(QuizSession.updateOne as jest.Mock).mockImplementation(() => {
        callCount++
        // First update fails (simulating concurrent update changing answer_version)
        if (callCount === 1) return Promise.resolve({ modifiedCount: 0 })
        // Second retry succeeds
        return Promise.resolve({ modifiedCount: 1 })
      })

      const result = await processImmediateAnswer(mockSession, [0], 0)
      expect(result.isCorrect).toBe(true)
      expect(QuizSession.updateOne).toHaveBeenCalledTimes(2)
    })

    it('should handle simultaneous parallel submissions using Promise.all atomically', async () => {
      let isFirstProcessed = false
      ;(QuizSession.updateOne as jest.Mock).mockImplementation(() => {
        if (!isFirstProcessed) {
          isFirstProcessed = true
          return Promise.resolve({ modifiedCount: 1 })
        }
        // Second concurrent update fails OCC check (version mismatch)
        return Promise.resolve({ modifiedCount: 0 })
      })

      const reqA = processImmediateAnswer(mockSession, [0], 0)
      const reqB = processImmediateAnswer(mockSession, [1], 0)

      const [resA, resB] = await Promise.allSettled([reqA, reqB])
      const fulfilled = [resA, resB].filter((r) => r.status === 'fulfilled')
      expect(fulfilled.length).toBeGreaterThanOrEqual(1)
    })

    it('should maintain monotonic current_question_index state invariant when answering a previous question', async () => {
      const advancedSession = {
        ...mockSession,
        current_question_index: 2,
        user_answers: [{ question_index: 1, answer_index: 1, answer_indexes: [1], is_correct: true }],
      }
      mockSessionForFind = advancedSession

      await processImmediateAnswer(advancedSession, [0], 0)

      expect(QuizSession.updateOne).toHaveBeenCalledWith(
        answerWriteFilter({ answer_version: 1 }),
        expect.objectContaining({
          $set: expect.objectContaining({
            current_question_index: 2, // Must remain 2, NOT rollback to 1
          }),
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
        answerWriteFilter({ answer_version: 1 }),
        expect.objectContaining({
          $set: expect.objectContaining({
            current_question_index: 1,
          }),
          $inc: { answer_version: 1 },
        })
      )
    })

    it('keeps the last review answer editable without revealing its score', async () => {
      mockSession.current_question_index = 1
      mockSession.user_answers = [
        { question_index: 0, answer_index: 0, answer_indexes: [0], is_correct: true },
      ]
      mockSession.score = 1

      const result = await processReviewAnswer(mockSession, [1]) // Correct for Q2

      expect(result.completed).toBe(false)
      expect(result).not.toHaveProperty('score')

      expect(QuizSession.updateOne).toHaveBeenCalledWith(
        answerWriteFilter({ answer_version: 1 }),
        expect.objectContaining({
          $set: expect.objectContaining({
            current_question_index: 1,
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
        { _id: 'session-123', status: { $ne: 'completed' }, answer_version: { $exists: false } },
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
