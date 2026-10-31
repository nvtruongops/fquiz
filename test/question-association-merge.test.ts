import { buildQuestionAssociationMergePlan } from '../scripts/lib/question-association-merge'
import { getQuestionIdentity } from '../packages/models/src/utils/question-identity'

describe('buildQuestionAssociationMergePlan', () => {
  const question = (overrides: Record<string, unknown> = {}) => ({
    _id: 'question-a',
    question_id: 'legacy-a',
    text: 'Which option is correct?',
    options: ['Alpha', 'Beta'],
    correct_answer: [0],
    explanation: 'Explanation A',
    quiz_ids: ['quiz-a'],
    usage_count: 1,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  })

  test('merges semantically identical standalone rows and rewrites every quiz reference in place', () => {
    const first = question()
    const duplicate = question({
      _id: 'question-b',
      question_id: 'legacy-b',
      options: ['Beta', 'Alpha.'],
      correct_answer: [1],
      explanation: 'A different stored explanation',
      quiz_ids: ['quiz-b'],
      usage_count: 1,
      created_at: new Date('2026-02-01T00:00:00.000Z'),
    })
    const plan = buildQuestionAssociationMergePlan({
      questions: [first, duplicate],
      questionbanks: [],
      quizzes: [{ _id: 'quiz-c', question_refs: ['question-b', 'question-a', 'question-b'] }],
      quizsessions: [],
    })

    expect(plan.blocked).toEqual([])
    expect(plan.groups).toHaveLength(1)
    expect(plan.groups[0]).toMatchObject({
      collection: 'questions',
      survivorId: 'question-a',
      duplicateIds: ['question-b'],
      survivorAfter: { quiz_ids: ['quiz-a', 'quiz-b'], usage_count: 2 },
    })
    expect(plan.groups[0].survivorAfter.question_id).toMatch(/^q_[a-f0-9]{16}$/)
    expect(plan.groups[0].survivorAfter.question_id_aliases).toEqual(expect.arrayContaining(['legacy-a', 'legacy-b', 'question-b']))
    expect(plan.references).toEqual([{ collection: 'quizzes', documentId: 'quiz-c', before: ['question-b', 'question-a', 'question-b'], after: ['question-a', 'question-a', 'question-a'] }])
  })

  test('blocks a same-prompt association when its correct answer text differs', () => {
    const first = question()
    const conflicting = question({ _id: 'question-b', question_id: 'legacy-b', correct_answer: [1] })
    const plan = buildQuestionAssociationMergePlan({ questions: [first, conflicting], questionbanks: [], quizzes: [], quizsessions: [] })

    expect(plan.groups).toEqual([])
    expect(plan.blocked).toEqual([expect.objectContaining({ collection: 'questions', reason: 'content-or-answer-conflict' })])
  })

  test('blocks a same-answer association with conflicting ownership metadata', () => {
    const first = question()
    const conflicting = question({ _id: 'question-b', question_id: 'legacy-b', created_by: 'user-b' })
    const plan = buildQuestionAssociationMergePlan({ questions: [first, conflicting], questionbanks: [], quizzes: [], quizsessions: [] })

    expect(plan.groups).toEqual([])
    expect(plan.blocked[0]).toMatchObject({ collection: 'questions', reason: 'metadata-conflict', metadataFields: ['created_by'] })
  })

  test('blocks canonicalization when another row currently owns the target ID', () => {
    const first = question()
    const duplicate = question({ _id: 'question-b', question_id: 'legacy-b' })
    const canonical = getQuestionIdentity(first).question_id
    const other = question({ _id: 'question-c', question_id: canonical, text: 'A different prompt' })
    const plan = buildQuestionAssociationMergePlan({ questions: [first, duplicate, other], questionbanks: [], quizzes: [], quizsessions: [] })

    expect(plan.groups).toEqual([])
    expect(plan.blocked[0]).toMatchObject({ collection: 'questions', reason: 'canonical-id-occupied' })
  })

  test('scopes bank association merges by category', () => {
    const a = question({ _id: 'bank-a', category_id: 'category-a', created_by: 'owner', used_in_quizzes: ['C1'], used_in_quiz_ids: ['quiz-a'] })
    const b = question({ _id: 'bank-b', category_id: 'category-b', created_by: 'owner', used_in_quizzes: ['C2'], used_in_quiz_ids: ['quiz-b'] })
    const plan = buildQuestionAssociationMergePlan({ questions: [], questionbanks: [a, b], quizzes: [], quizsessions: [] })

    expect(plan.groups).toEqual([])
    expect(plan.blocked).toEqual([])
  })

  test('leaves bank usage caches to the authoritative post-merge recomputation', () => {
    const a = question({ _id: 'bank-a', category_id: 'category-a', created_by: 'owner', used_in_quizzes: ['OLD'], used_in_quiz_ids: ['quiz-a'], usage_count: 1 })
    const b = question({ _id: 'bank-b', category_id: 'category-a', created_by: 'owner', used_in_quizzes: ['OTHER'], used_in_quiz_ids: ['quiz-b'], usage_count: 1 })
    const plan = buildQuestionAssociationMergePlan({ questions: [], questionbanks: [a, b], quizzes: [], quizsessions: [] })

    expect(plan.groups).toHaveLength(1)
    expect(plan.groups[0].survivorAfter).not.toHaveProperty('used_in_quizzes')
    expect(plan.groups[0].survivorAfter).not.toHaveProperty('used_in_quiz_ids')
    expect(plan.groups[0].survivorAfter).not.toHaveProperty('usage_count')
  })

  test('merges Mongoose version and empty-image metadata without dropping a real image', () => {
    const first = question({ _id: 'bank-a', category_id: 'category-a', created_by: 'owner', image_url: '', __v: 2 })
    const duplicate = question({ _id: 'bank-b', question_id: 'legacy-b', category_id: 'category-a', created_by: 'owner', image_url: 'https://cdn.example/image.png', __v: 5 })
    const plan = buildQuestionAssociationMergePlan({ questions: [], questionbanks: [first, duplicate], quizzes: [], quizsessions: [] })

    expect(plan.blocked).toEqual([])
    expect(plan.groups).toHaveLength(1)
    expect(plan.groups[0].survivorId).toBe('bank-b')
    expect(plan.groups[0].survivorAfter).toMatchObject({ image_url: 'https://cdn.example/image.png', __v: 5 })
  })
})
