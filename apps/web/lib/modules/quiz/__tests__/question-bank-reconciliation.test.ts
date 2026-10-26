import { buildQuestionBankOperations } from '../question-bank-reconciliation'

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
        filter: { question_id: 'q1' },
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
})
