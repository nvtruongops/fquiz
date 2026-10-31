import { buildQuestionBankOperations, normalizeQuestionUsageCodes, resolveQuestionBankUsageCodes } from '../question-bank-reconciliation'
import { parseQuestionBankAnalyticsParams, resolveQuestionBankQuestions } from '@fquiz/models'

describe('question bank usage codes', () => {
  it('counts distinct normalized quiz codes rather than quiz documents', () => {
    expect(normalizeQuestionUsageCodes([' bio101 ', 'BIO101', 'CS201', 'mix_demo', 'TEMP_demo', null]))
      .toEqual(['BIO101', 'CS201'])

    const quizCodes = new Map([
      ['quiz-1', 'bio101'],
      ['quiz-2', 'BIO101'],
      ['quiz-3', 'CS201'],
    ])
    expect(resolveQuestionBankUsageCodes({ used_in_quiz_ids: ['quiz-1', 'quiz-2', 'quiz-3'] }, quizCodes))
      .toEqual(['BIO101', 'CS201'])
  })

  it('normalizes legacy cached usage when quiz IDs are not available', () => {
    expect(resolveQuestionBankUsageCodes({ used_in_quizzes: ['bio101', 'BIO101', 'cs201'] }, new Map()))
      .toEqual(['BIO101', 'CS201'])
  })

  it('validates analytics filters and clamps page size consistently', () => {
    const params = parseQuestionBankAnalyticsParams(new URLSearchParams('category_id=bad&page=0&per_page=500&search=%20biology%20'))
    expect(params).toEqual({ invalidCategory: true, page: 1, per_page: 200, search: 'biology', category_id: undefined })
  })

  it('resolves analytics usage from quiz IDs while counting distinct course codes', async () => {
    const lean = jest.fn().mockResolvedValue([
      { _id: 'quiz-1', course_code: 'bio101' },
      { _id: 'quiz-2', course_code: 'BIO101' },
    ])
    const select = jest.fn().mockReturnValue({ lean })
    const find = jest.fn().mockReturnValue({ select })
    const questions = await resolveQuestionBankQuestions([
      { question_id: 'q1', used_in_quiz_ids: ['quiz-1', 'quiz-2'], used_in_quizzes: [] },
    ], { find } as any)

    expect(find).toHaveBeenCalledWith({ _id: { $in: ['quiz-1', 'quiz-2'] } })
    expect(questions[0].used_in_quizzes).toEqual(['BIO101'])
    expect(questions[0].usage_count).toBe(1)
  })
})

describe('buildQuestionBankOperations', () => {
  it('deduplicates shared questions and excludes mix and temporary quiz codes', () => {
    const result = buildQuestionBankOperations([
      {
        _id: 'quiz-1', course_code: 'bio101', category_id: 'cat-1', created_by: 'user-1',
        questions: [{ question_id: 'q1', text: 'Question', options: ['A', 'B'], correct_answer: [0] }],
      },
      {
        _id: 'quiz-2', course_code: 'BIO101', category_id: 'cat-1', created_by: 'user-2',
        questions: [{ question_id: 'q1', text: 'Question', options: ['A', 'B'], correct_answer: [0] }],
      },
      { _id: 'quiz-3', course_code: 'MIX_test', questions: [{ question_id: 'q2' }] },
      { _id: 'quiz-4', course_code: 'TEMP_test', questions: [{ question_id: 'q3' }] },
    ] as any[])

    expect(result.syncedQuestionIds).toEqual(['q1'])
    expect(result.bulkOps).toEqual([{
      updateOne: {
        filter: { category_id: 'cat-1', question_id: 'q1' },
        update: {
          $set: expect.objectContaining({
            category_id: 'cat-1', used_in_quizzes: ['BIO101'],
            used_in_quiz_ids: ['quiz-1', 'quiz-2'], usage_count: 1,
          }),
          $setOnInsert: { created_by: 'user-1' },
        },
        upsert: true,
      },
    }])
  })

  it('keeps per-category associations for the same shared question ID', () => {
    const q = { question_id: 'q1', text: 'Question', options: ['A', 'B'], correct_answer: [0] }
    const result = buildQuestionBankOperations([
      { _id: 'one', category_id: 'cat-1', created_by: 'user', course_code: 'CS1', questions: [q] },
      { _id: 'two', category_id: 'cat-2', created_by: 'user', course_code: 'CS2', questions: [q] },
    ])
    expect(result.bulkOps.map(op => op.updateOne.filter)).toEqual([
      { category_id: 'cat-1', question_id: 'q1' },
      { category_id: 'cat-2', question_id: 'q1' },
    ])
    expect(result.syncedQuestionIds).toEqual(['q1'])
  })

  it('rejects conflicting answer variants rather than retaining the first', () => {
    const quiz = { category_id: 'cat', created_by: 'user', course_code: 'CS', questions: [
      { question_id: 'q1', text: 'Question', options: ['A', 'B'], correct_answer: [0] },
      { question_id: 'q1', text: 'Question', options: ['A', 'B'], correct_answer: [1] },
    ] }
    expect(() => buildQuestionBankOperations([quiz])).toThrow(/conflict/i)
  })

  it('accepts equivalent answer texts after reordering options', () => {
    const result = buildQuestionBankOperations([{ category_id: 'cat', created_by: 'user', course_code: 'CS', questions: [
      { question_id: 'q1', text: 'Question', options: ['Apple', 'Berry'], correct_answer: [0] },
      { question_id: 'q1', text: 'Question', options: ['Berry', 'Apple'], correct_answer: [1] },
    ] }])
    expect(result.bulkOps).toHaveLength(1)
  })
})
