import { getPublicQuizFilter } from '@/lib/modules/quiz/utils/public-quiz-filter'
import { QuestionUsageService } from '@/lib/modules/quiz/services/question-usage.service'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { Question } from '@/lib/modules/quiz/models/Question'
jest.mock('@/lib/modules/quiz/models/Question', () => ({ Question: { find: jest.fn().mockReturnValue({ select: () => ({ lean: async () => [] }) }) } }))

jest.mock('@/lib/modules/quiz/models/QuestionBank', () => ({
  QuestionBank: {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { course_code: 'IT001', questions: [{ question_id: 'q_test1', text: 'Question text 1' }] },
          { course_code: 'it001', questions: [{ question_id: 'q_test1', text: 'Question text 1' }] },
          { course_code: 'IT002', questions: [{ question_id: 'q_test1', text: 'Question text 1' }] },
          { course_code: 'ENG101', questions: [{ question_id: 'q_test3', text: 'Question text 3' }] },
          {
            question_id: 'q_test1',
            text: 'Question text 1',
            used_in_quizzes: ['IT001', 'IT002', 'IT001'],
          },
          {
            question_id: 'q_test2',
            text: 'Question text 2',
            used_in_quizzes: ['MIX_123', 'TEMP_456'],
          },
          {
            question_id: 'q_test3',
            text: 'Question text 3',
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
          { course_code: 'IT001', questions: [{ question_id: 'q_test1', text: 'Question text 1' }] },
          { course_code: 'it001', questions: [{ question_id: 'q_test1', text: 'Question text 1' }] },
          { course_code: 'IT002', questions: [{ question_id: 'q_test1', text: 'Question text 1' }] },
          { course_code: 'ENG101', questions: [{ question_id: 'q_test3', text: 'Question text 3' }] },
          {
            course_code: 'IT003',
            questions: [{ question_id: 'q_test2', text: 'Question text 2' }],
          },
          {
            course_code: 'IT004',
            questions: [{ question_id: 'q_test_by_text', text: 'Text only question' }],
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

  it('should support object query items with text and question_id', async () => {
    const result = await QuestionUsageService.getBatchQuestionPublicUsage([
      { question_id: 'q_test1', text: 'Question text 1' },
      { text: 'Text only question' },
    ], 'CURRENT_01')

    const usage1 = result.get('q_test1')
    expect(usage1).toBeDefined()
    expect(usage1?.quizzes).toContain('IT001')
    expect(usage1?.quizzes).toContain('IT002')
    expect(usage1?.quizzes).not.toContain('CURRENT_01')

    const usageText = result.get('Text only question')
    expect(usageText).toBeDefined()
    expect(usageText?.quizzes).toContain('IT004')
    expect(usageText?.quizzes).not.toContain('CURRENT_01')
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

  it('does not count stale bank-only codes or fall back to prompt when an ID is supplied', async () => {
    const result = await QuestionUsageService.getQuestionPublicUsage({ question_id: 'unknown-id', text: 'Text only question' }, 'PRIVATE_CODE')
    expect(result).toEqual({ count: 0, quizzes: [] })
  })

  it('reflects a quiz deletion immediately instead of returning a process-local cached count', async () => {
    const find = jest.mocked(Quiz.find)
    find.mockReturnValueOnce({ select: () => ({ lean: async () => [] }) } as any)
    expect(await QuestionUsageService.getQuestionPublicUsage('q_test1')).toEqual({ count: 0, quizzes: [] })
    expect(find).toHaveBeenLastCalledWith(expect.objectContaining(getPublicQuizFilter()))
  })

  it('counts actual referenced-only quizzes using the standalone canonical identity', async () => {
    ;(Question.find as jest.Mock).mockReturnValueOnce({ select: () => ({ lean: async () => [{ _id: 'ref-1', question_id: 'q_ref', text: 'Reference' }] }) })
    ;(Quiz.find as jest.Mock).mockReturnValueOnce({ select: () => ({ lean: async () => [{ course_code: 'REF101', questions: [], question_refs: ['ref-1'] }] }) })
    expect(await QuestionUsageService.getQuestionPublicUsage('q_ref')).toEqual({ count: 1, quizzes: ['REF101'] })
  })
  it('resolves an unchanged snapshot through legacy identity aliases after a metadata save', async () => {
    ;(Quiz.find as jest.Mock).mockReturnValueOnce({ select: () => ({ lean: async () => [{ course_code: 'LEGACY', questions: [{ question_id: 'q_new', question_id_aliases: ['old-id'], text: 'Old snapshot', options: ['Apple', 'Berry'] }] }] }) })
    expect(await QuestionUsageService.getQuestionPublicUsage({ question_id: 'old-id', text: 'Old snapshot', options: ['Apple', 'Berry'] })).toEqual({ count: 1, quizzes: ['LEGACY'] })
  })
  it('does not group different content variants merely because a legacy alias is reused', async () => {
    ;(Quiz.find as jest.Mock).mockReturnValueOnce({ select: () => ({ lean: async () => [
      { course_code: 'ONE', questions: [{ question_id: 'q_one', question_id_aliases: ['collision'], text: 'Same prompt', options: ['Apple', 'Berry'] }] },
      { course_code: 'TWO', questions: [{ question_id: 'q_two', question_id_aliases: ['collision'], text: 'Same prompt', options: ['Apple', 'Cherry'] }] },
    ] }) })
    expect(await QuestionUsageService.getQuestionPublicUsage({ question_id: 'collision', text: 'Same prompt', options: ['Apple', 'Berry'] })).toEqual({ count: 1, quizzes: ['ONE'] })
  })
})
