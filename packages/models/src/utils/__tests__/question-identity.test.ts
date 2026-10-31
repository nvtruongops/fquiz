import { getQuestionIdentity, findQuestionSnapshot } from '../question-identity'

const original = { _id: 'occurrence', text: 'Choose 2 answers', options: ['Apple', 'Berry', 'Cherry'], correct_answer: [0, 1] }
test('canonical identity is independent of occurrence, category, option order and corrected key', () => {
  const first = getQuestionIdentity(original)
  expect(first.question_id).toMatch(/^q_[a-f0-9]{16}$/)
  expect(first.question_id_aliases).toContain('occurrence')
  expect(getQuestionIdentity({ ...original, correct_answer: [0, 2] }).question_id).toBe(first.question_id)
  expect(getQuestionIdentity({ ...original, options: ['Cherry', 'Apple', 'Berry'] }).question_id).toBe(first.question_id)
  expect(getQuestionIdentity({ ...original, text: 'Different' }).question_id).not.toBe(first.question_id)
})
test('keeps prior identity aliases and is idempotent', () => {
  const migrated = { ...original, ...getQuestionIdentity({ ...original, question_id: 'legacy' }) }
  expect(migrated.question_id_aliases).toContain('legacy')
  expect(getQuestionIdentity(migrated)).toEqual(getQuestionIdentity({ ...original, question_id: 'legacy' }))
})
test('a legacy ID never overrides different content, or silently chooses conflicting keys', () => {
  expect(findQuestionSnapshot([original], { ...original, question_id: 'occurrence', options: ['Other', 'Berry', 'Cherry'] })).toBeUndefined()
  expect(findQuestionSnapshot([original, { ...original, correct_answer: [1, 2] }], original)).toBeUndefined()
  expect(findQuestionSnapshot([original], { ...original, question_id: getQuestionIdentity(original).question_id })).toBe(original)
})
