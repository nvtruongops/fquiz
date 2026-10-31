import { applyQuestionUsageCacheChanges, buildQuestionUsageCachePlan, restoreQuestionUsageCacheChanges } from '../scripts/lib/question-usage-cache-reconciliation'
import { getQuestionIdentity } from '../packages/models/src/utils/question-identity'

const question = { text: 'Question', options: ['A', 'B'], correct_answer: [1] }
const reference = { _id: 'ref-1', text: 'Referenced', options: ['C', 'D'], correct_answer: [0] }
const bankRow = (q: typeof question, categoryId = 'category') => ({
  ...q, _id: `bank-${q.text}`, category_id: categoryId, question_id: getQuestionIdentity(q).question_id,
  created_by: 'creator', used_in_quizzes: [], usage_count: 0, used_in_quiz_ids: [],
})

test('counts distinct normalized course codes across embedded and referenced quiz questions', () => {
  const plan = buildQuestionUsageCachePlan({
    quizzes: [
      { _id: 'quiz-1', category_id: 'category', course_code: ' bio101 ', status: 'published', questions: [question], question_refs: ['ref-1'] },
      { _id: 'quiz-2', category_id: 'category', course_code: 'BIO101', status: 'published', questions: [question] },
      { _id: 'quiz-3', category_id: 'category', course_code: 'CHEM101', status: 'published', question_refs: ['ref-1'] },
    ],
    questions: [reference],
    questionbanks: [bankRow(question), bankRow(reference)],
  })
  const questionChange = plan.changes.find(change => change.id === 'bank-Question')!
  const referenceChange = plan.changes.find(change => change.id === 'bank-Referenced')!
  expect(questionChange.set).toMatchObject({ used_in_quizzes: ['BIO101'], usage_count: 1, used_in_quiz_ids: ['quiz-1', 'quiz-2'] })
  expect(referenceChange.set).toMatchObject({ used_in_quizzes: ['BIO101', 'CHEM101'], usage_count: 2, used_in_quiz_ids: ['quiz-1', 'quiz-3'] })
})

test('does not plan cache writes for blocked keys, answer conflicts, or duplicate associations', () => {
  const conflictQuestion = { ...question, correct_answer: [0] }
  const blockedId = getQuestionIdentity(question).question_id
  const plan = buildQuestionUsageCachePlan({
    quizzes: [{ _id: 'quiz', category_id: 'category', course_code: 'BIO101', status: 'published', questions: [question, conflictQuestion] }],
    questions: [],
    questionbanks: [bankRow(question), bankRow({ ...question, correct_answer: [0] })],
  }, [blockedId])
  expect(plan.changes).toHaveLength(0)
  expect(plan.conflicts.map(conflict => conflict.reason)).toEqual(expect.arrayContaining(['answer-key-variants', 'duplicate-canonical-association']))
})

test('keeps all counters in a category unchanged when a published reference is dangling', () => {
  const plan = buildQuestionUsageCachePlan({
    quizzes: [{ _id: 'quiz', category_id: 'category', course_code: 'BIO101', status: 'published', questions: [question], question_refs: ['missing'] }],
    questions: [],
    questionbanks: [bankRow(question)],
  })
  expect(plan.changes).toHaveLength(0)
  expect(plan.conflicts).toContainEqual(expect.objectContaining({ reason: 'dangling-question-reference', categoryId: 'category' }))
})

test('applies cache-only writes with CAS and can restore owned changes', async () => {
  const change = buildQuestionUsageCachePlan({
    quizzes: [{ _id: 'quiz', category_id: 'category', course_code: 'BIO101', status: 'published', questions: [question] }],
    questions: [],
    questionbanks: [bankRow(question)],
  }).changes[0]
  const updateOne = jest.fn().mockResolvedValue({ matchedCount: 1 })
  const db = { collection: () => ({ updateOne }) }
  expect(await applyQuestionUsageCacheChanges(db, [change], 'usage-1')).toEqual({ applied: 1, skipped: 0 })
  expect(updateOne.mock.calls[0][1].$set).toMatchObject({ used_in_quizzes: ['BIO101'], usage_count: 1 })
  expect(updateOne.mock.calls[0][1].$set).not.toHaveProperty('correct_answer')
  expect(await restoreQuestionUsageCacheChanges(db, [change], 'usage-1')).toEqual({ applied: 1, skipped: 0 })
  expect(updateOne.mock.calls[1][0]._question_usage_reconciliation).toBe('usage-1:0')
})
