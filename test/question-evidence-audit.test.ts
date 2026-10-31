import { auditQuestionEvidence } from '../scripts/lib/question-evidence-audit'
const q = { text: 'Question', options: ['Apple', 'Berry'], correct_answer: [0] }
test('reports ambiguous legacy identities, key conflicts and dangling references without guessing a key', () => {
  const report = auditQuestionEvidence({ quizzes: [{ _id: 'quiz', category_id: 'category', course_code: 'T', status: 'published', question_refs: ['missing'], questions: [
    { ...q, question_id: 'old' }, { ...q, text: 'Different', question_id: 'old' }, { ...q, correct_answer: [1] },
  ] }], questions: [], questionbanks: [{ _id: 'bank', ...q, category_id: 'category', used_in_quizzes: ['DELETED'] }] })
  expect(report.map(x => x.reason)).toEqual(expect.arrayContaining(['legacy-id-has-multiple-content-revisions', 'answer-key-variants', 'dangling-question-reference', 'missing-bank-creator', 'bank-usage-cache-mismatch']))
})
