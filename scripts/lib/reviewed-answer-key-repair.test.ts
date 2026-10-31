import { getQuestionIdentity } from '../../packages/models/src/utils/question-identity'
import { applyReviewedAnswerKeyChanges, planReviewedAnswerKeyRepair, restoreReviewedAnswerKeyChanges } from './reviewed-answer-key-repair'

const question = {
  text: 'Choose two',
  options: ['First', 'Second', 'Third', 'Fourth'],
  correct_answer: [0],
}
const id = getQuestionIdentity(question).question_id

test('maps reviewed answer text to every occurrence option order and keeps multi-answer keys', () => {
  const reversed = {
    text: question.text,
    options: ['Fourth', 'Third', 'Second', 'First'],
    correct_answer: [3],
    _id: 'quiz-question',
  }
  const plan = planReviewedAnswerKeyRepair([
    { collection: 'questionbanks', documentId: 'bank-1', question },
    { collection: 'quizzes', documentId: 'quiz-1', questionIndex: 4, question: reversed },
  ], [{ canonicalId: id, answerTexts: ['Fourth', 'Second'] }])

  expect(plan.blocked).toEqual([])
  expect(plan.changes.map(change => change.after)).toEqual([[1, 3], [0, 2]])
  expect(plan.changes[1]).toMatchObject({ collection: 'quizzes', questionIndex: 4, itemId: 'quiz-question' })
})

test('blocks every occurrence of a reviewed identity when one copy cannot map the answer uniquely', () => {
  const ambiguous = { ...question, options: ['First', 'Second', 'Second', 'Fourth'] }
  const ambiguousId = getQuestionIdentity(ambiguous).question_id
  const plan = planReviewedAnswerKeyRepair([
    { collection: 'questionbanks', documentId: 'bank-1', question: ambiguous },
    { collection: 'quizzes', documentId: 'quiz-1', questionIndex: 0, question: { ...ambiguous, _id: 'quiz-question' } },
  ], [{ canonicalId: ambiguousId, answerTexts: ['Second'] }])

  expect(plan.changes).toEqual([])
  expect(plan.blocked).toHaveLength(2)
  expect(plan.blocked.every(block => block.canonicalId === ambiguousId && block.reason === 'answer-option-not-unique')).toBe(true)
})

test('does not plan writes to historical or active session snapshots', () => {
  const plan = planReviewedAnswerKeyRepair([
    { collection: 'quizsessions', documentId: 'session-1', question },
  ], [{ canonicalId: id, answerTexts: ['Second'] }])

  expect(plan.changes).toEqual([])
  expect(plan.blocked).toEqual([expect.objectContaining({ canonicalId: id, reason: 'missing-occurrences' })])
})

test('applies and restores embedded quiz answer changes with option, answer and ownership CAS guards', async () => {
  const embedded = { ...question, options: [...question.options], _id: 'quiz-question' }
  const change = planReviewedAnswerKeyRepair([
    { collection: 'quizzes', documentId: 'quiz-1', questionIndex: 4, question: embedded },
  ], [{ canonicalId: id, answerTexts: ['Fourth', 'Second'] }]).changes[0]
  const calls: Array<{ filter: any; update: any; options?: any }> = []
  const db = { collection: () => ({
    updateOne: jest.fn(async (filter, update, options) => {
      calls.push({ filter, update, options })
      return { matchedCount: 1, modifiedCount: 1 }
    }),
  }) }

  expect(await applyReviewedAnswerKeyChanges(db, [change], 'answers-1')).toEqual({ applied: 1, skipped: 0 })
  expect(calls[0].options.arrayFilters[0]).toMatchObject({ 'question._id': 'quiz-question', 'question.correct_answer': [0] })
  expect(calls[0].update.$set).toMatchObject({ 'questions.$[question].correct_answer': [1, 3], 'questions.$[question]._reviewed_answer_key_repair': 'answers-1:0' })

  expect(await restoreReviewedAnswerKeyChanges(db, [change], 'answers-1')).toEqual({ restored: 1, skipped: 0 })
  expect(calls[1].options.arrayFilters[0]).toMatchObject({ 'question.correct_answer': [1, 3], 'question._reviewed_answer_key_repair': 'answers-1:0' })
  expect(calls[1].update.$set).toMatchObject({ 'questions.$[question].correct_answer': [0] })
  expect(Object.keys(calls[1].update.$unset)).toContain('questions.$[question]._reviewed_answer_key_repair')
})
