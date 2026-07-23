import { inferSourceType, sourceLabelFromType, mixQuizDisplayCode, resolveSourceCreatorId } from '../quiz-source-utils'
import { validateQuizSessionRequest } from '../session-utils'
import { Types } from 'mongoose'

jest.mock('@/lib/core/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue({}),
}))

jest.mock('../models/QuizSession', () => ({
  QuizSession: {
    findById: jest.fn(),
  },
}))

import { QuizSession } from '../models/QuizSession'

describe('Quiz Source & Session Utilities Test Suite', () => {
  describe('inferSourceType', () => {
    const studentId = new Types.ObjectId().toString()

    test('identifies saved_explore quizzes', () => {
      const quiz = {
        _id: new Types.ObjectId(),
        is_saved_from_explore: true,
        original_quiz_id: new Types.ObjectId(),
      }
      expect(inferSourceType(quiz as any, studentId)).toBe('saved_explore')
    })

    test('identifies self_created quizzes', () => {
      const quiz = {
        _id: new Types.ObjectId(),
        created_by: new Types.ObjectId(studentId),
        is_saved_from_explore: false,
      }
      expect(inferSourceType(quiz as any, studentId)).toBe('self_created')
    })

    test('identifies explore_public quizzes', () => {
      const quiz = {
        _id: new Types.ObjectId(),
        created_by: new Types.ObjectId(),
        is_saved_from_explore: false,
      }
      expect(inferSourceType(quiz as any, studentId)).toBe('explore_public')
    })
  })

  describe('sourceLabelFromType', () => {
    test('returns correct user-friendly string', () => {
      expect(sourceLabelFromType('self_created')).toBe('Tự tạo')
      expect(sourceLabelFromType('saved_explore')).toBe('Từ Explore')
      expect(sourceLabelFromType('explore_public')).toBe('Từ Explore')
    })
  })

  describe('mixQuizDisplayCode', () => {
    test('removes prefix and truncates long titles', () => {
      expect(mixQuizDisplayCode('Quiz Trộn · Short Code')).toBe('Short Code')
      expect(mixQuizDisplayCode('Quiz Trộn · MLN122_SP26_C1_FE_VERY_LONG_EXTENDED_SUBJECT_NAME')).toBe('MLN122_SP26_C1_FE_VERY_LONG_EXTENDED_...')
    })
  })

  describe('resolveSourceCreatorId', () => {
    test('resolves original creator ID from map for saved explore quizzes', () => {
      const origId = new Types.ObjectId().toString()
      const creatorId = new Types.ObjectId().toString()
      const map = new Map([[origId, creatorId]])

      const quiz = {
        _id: new Types.ObjectId(),
        is_saved_from_explore: true,
        original_quiz_id: new Types.ObjectId(origId),
      }

      expect(resolveSourceCreatorId(quiz as any, map)).toBe(creatorId)
    })
  })

  describe('validateQuizSessionRequest', () => {
    test('returns 400 for invalid ObjectId string', async () => {
      const payload = { userId: 'u1', email: 'test@example.com', role: 'student', tokenVersion: 1 }
      const res = await validateQuizSessionRequest('invalid-id', payload)

      expect(res.isValid).toBe(false)
      if (!res.isValid) {
        expect(res.response.status).toBe(400)
      }
    })

    test('returns 404 if session does not exist', async () => {
      const validId = new Types.ObjectId().toString()
      const payload = { userId: 'u1', email: 'test@example.com', role: 'student', tokenVersion: 1 }

      ;(QuizSession.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      })

      const res = await validateQuizSessionRequest(validId, payload)
      expect(res.isValid).toBe(false)
      if (!res.isValid) {
        expect(res.response.status).toBe(404)
      }
    })

    test('returns 403 if session belongs to another student', async () => {
      const validId = new Types.ObjectId().toString()
      const studentId = new Types.ObjectId().toString()
      const otherStudentId = new Types.ObjectId().toString()
      const payload = { userId: studentId, email: 'test@example.com', role: 'student', tokenVersion: 1 }

      ;(QuizSession.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: validId,
          student_id: new Types.ObjectId(otherStudentId),
          status: 'active',
        }),
      })

      const res = await validateQuizSessionRequest(validId, payload)
      expect(res.isValid).toBe(false)
      if (!res.isValid) {
        expect(res.response.status).toBe(403)
      }
    })
  })
})
