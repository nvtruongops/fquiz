import { normalizeImportedQuiz } from '../normalizer'
import { validateImportedQuiz } from '../validator'

function preview(key: unknown, plural = false) {
  const raw = { quizMeta: { course_code: 'TEST' }, questions: [{ text: 'Question?', options: ['Apple', 'Berry', 'Cherry', 'Date'], [plural ? 'correct_answers' : 'correct_answer']: key }] }
  const normalized = normalizeImportedQuiz(raw)
  return { normalized, validation: validateImportedQuiz(raw, normalized) }
}
test.each([['A,B'], [['A,B', 'C']]])('supports composite answer strings without losing entries: %j', key => {
  const result = preview(key, true)
  expect(result.normalized.questions[0].correct_answer).toEqual(typeof key === 'string' ? [0, 1] : [0, 1, 2])
  expect(result.validation.isValid).toBe(true)
})
test.each([['A', 'junk'], ['A', -1], ['A', 1.5], ['A', '1-2']])('rejects partial parse instead of accepting just valid tokens: %j', (...tokens) => {
  const result = preview(tokens)
  expect(result.validation.isValid).toBe(false)
  expect(result.validation.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'INVALID_CORRECT_ANSWER_TOKEN' })]))
})
test('keeps numeric arrays zero-based', () => expect(preview([0, 2]).normalized.questions[0].correct_answer).toEqual([0, 2]))
