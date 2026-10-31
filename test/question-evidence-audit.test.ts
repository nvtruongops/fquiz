import { auditQuestionEvidence } from '../scripts/lib/question-evidence-audit'
import { generateQuestionId } from '../packages/models/src/utils/question-id-generator'
const q = { text: 'Question', options: ['Apple', 'Berry'], correct_answer: [0] }
test('reports ambiguous legacy identities, key conflicts and dangling references without guessing a key', () => {
  const report = auditQuestionEvidence({ quizzes: [{ _id: 'quiz', category_id: 'category', course_code: 'T', status: 'published', question_refs: ['missing'], questions: [
    { ...q, question_id: 'old' }, { ...q, text: 'Different', question_id: 'old' }, { ...q, correct_answer: [1] },
  ] }], questions: [], questionbanks: [{ _id: 'bank', ...q, category_id: 'category', used_in_quizzes: ['DELETED'] }] })
  expect(report.map(x => x.reason)).toEqual(expect.arrayContaining(['legacy-id-has-multiple-content-revisions', 'answer-key-variants', 'dangling-question-reference', 'missing-bank-creator', 'bank-usage-cache-mismatch']))
})
test('counts mixed embedded and referenced quiz questions in the bank usage audit', () => {
  const referenced = { _id: 'reference', text: 'Referenced', options: ['One', 'Two'], correct_answer: [1] }
  const report = auditQuestionEvidence({
    quizzes: [{ _id: 'quiz', category_id: 'category', course_code: 'BIO101', status: 'published', questions: [q], question_refs: ['reference'] }],
    questions: [referenced],
    questionbanks: [{ ...referenced, _id: 'bank', category_id: 'category', question_id: generateQuestionId(referenced), created_by: 'creator', used_in_quizzes: ['BIO101'], usage_count: 1 }],
  })
  expect(report.filter(item => item.reason === 'bank-usage-cache-mismatch')).toHaveLength(0)
})

test('uses the same usage-code rules as cache reconciliation for internal quiz codes', () => {
  const report = auditQuestionEvidence({
    quizzes: [
      { _id: 'temp-quiz', category_id: 'category', course_code: 'TEMP_preview', status: 'published', questions: [q] },
      { _id: 'mix-quiz', category_id: 'category', course_code: 'MIX_2', status: 'published', questions: [q] },
    ],
    questions: [],
    questionbanks: [{ _id: 'bank', ...q, category_id: 'category', question_id: generateQuestionId(q), created_by: 'creator', used_in_quizzes: [], usage_count: 0 }],
  })
  expect(report.filter(item => item.reason === 'bank-usage-cache-mismatch')).toHaveLength(0)
})
