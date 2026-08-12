import { getPublicQuizFilter } from '@/lib/modules/quiz/utils/public-quiz-filter'
import { QuestionUsageService } from '@/lib/modules/quiz/services/question-usage.service'

jest.mock('@/lib/modules/quiz/models/QuestionBank', () => ({
  QuestionBank: {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            question_id: 'q_test1',
            used_in_quizzes: ['IT001', 'IT002', 'IT001'],
          },
          {
            question_id: 'q_test2',
            used_in_quizzes: ['MIX_123', 'TEMP_456'],
          },
          {
            question_id: 'q_test3',
            used_in_quizzes: ['ENG101'],
          },
        ]),
      }),
    }),
  },
}))

jest.mock('@/lib/modules/quiz/models/Quiz', () => ({
  Quiz: {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            course_code: 'IT003',
            questions: [{ question_id: 'q_test2' }],
          },
        ]),
      }),
    }),
  },
}))

describe('QuestionUsageService & PublicQuizFilter', () => {
  it('should return exact public quiz filter predicate', () => {
    const filter = getPublicQuizFilter()
    expect(filter).toEqual({
      is_public: true,
      status: 'published',
      is_temp: { $ne: true },
      is_saved_from_explore: { $ne: true },
    })
  })

  it('should resolve question usage count equal to unique public course_code length', async () => {
    const result = await QuestionUsageService.getBatchQuestionPublicUsage(['q_test1', 'q_test2', 'q_test3'])

    result.forEach((usage) => {
      // INVARIANT 1: count MUST strictly equal quizzes.length
      expect(usage.count).toBe(usage.quizzes.length)
      // INVARIANT 2: quizzes array MUST NOT contain duplicates
      expect(new Set(usage.quizzes).size).toBe(usage.quizzes.length)
      // INVARIANT 3: quizzes array MUST NOT contain temporary session prefixes
      usage.quizzes.forEach((code) => {
        expect(code.startsWith('MIX_')).toBe(false)
        expect(code.startsWith('TEMP_')).toBe(false)
      })
    })

    const usage1 = result.get('q_test1')
    expect(usage1).toBeDefined()
    expect(usage1?.quizzes).toEqual(['IT001', 'IT002'])
    expect(usage1?.count).toBe(2)

    const usage2 = result.get('q_test2')
    expect(usage2).toBeDefined()
    expect(usage2?.quizzes).toEqual(['IT003'])
    expect(usage2?.count).toBe(1)

    const usage3 = result.get('q_test3')
    expect(usage3).toBeDefined()
    expect(usage3?.quizzes).toEqual(['ENG101'])
    expect(usage3?.count).toBe(1)
  })

  it('should handle single question usage lookup via getQuestionPublicUsage', async () => {
    const usage = await QuestionUsageService.getQuestionPublicUsage('q_test1')
    expect(usage.count).toBe(2)
    expect(usage.quizzes).toEqual(['IT001', 'IT002'])
  })

  it('should handle empty or invalid question IDs gracefully', async () => {
    const result = await QuestionUsageService.getBatchQuestionPublicUsage([])
    expect(result.size).toBe(0)

    const singleUsage = await QuestionUsageService.getQuestionPublicUsage('')
    expect(singleUsage).toEqual({ count: 0, quizzes: [] })
  })
})
