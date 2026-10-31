import { buildIdentityPlan, applyIdentityChanges, restoreIdentityChanges } from '../scripts/lib/question-identity-migration'
import { getQuestionIdentity } from '../packages/models/src/utils/question-identity'

const question = { _id: 'occurrence', text: 'Choose 2 answers', options: ['Apple', 'Berry', 'Cherry'], correct_answer: [0, 1] }
test('plans metadata only, preserves session results, and is idempotent', () => {
  const snapshot = { _id: 'session', score: 7, status: 'completed', questions_cache: [question], user_answers: [{ question_index: 0, answer_indexes: [0, 1] }] }
  const input = JSON.parse(JSON.stringify(snapshot))
  const plan = buildIdentityPlan({ quizsessions: [input] })
  expect(input).toEqual(snapshot)
  expect(plan.changes).toHaveLength(1)
  const set = plan.changes[0].set
  expect(Object.keys(set).sort()).toEqual(['questions_cache.0.question_id', 'questions_cache.0.question_id_aliases'])
  const migrated = { ...question, question_id: set['questions_cache.0.question_id'], question_id_aliases: set['questions_cache.0.question_id_aliases'] }
  expect(buildIdentityPlan({ quizsessions: [{ ...snapshot, questions_cache: [migrated] }] }).changes).toHaveLength(0)
})
test('does not collide with unique bank association or standalone indexes', () => {
  const a = { ...question, _id: 'one', category_id: 'category', question_id: 'old-one' }
  const b = { ...question, _id: 'two', category_id: 'category', question_id: 'old-two' }
  const plan = buildIdentityPlan({ questionbanks: [a, b] })
  expect(plan.changes).toHaveLength(0)
  expect(plan.conflicts).toEqual(expect.arrayContaining([expect.objectContaining({ reason: 'duplicate-canonical-association' })]))
})
test('blocks all snapshots for duplicate canonical source associations', () => {
  const duplicateA = { ...question, _id: 'one', question_id: 'old-one' }
  const duplicateB = { ...question, _id: 'two', question_id: 'old-two' }
  const plan = buildIdentityPlan({
    questions: [duplicateA, duplicateB],
    quizzes: [{ _id: 'quiz', questions: [{ ...question, question_id: 'old-one' }] }],
    quizsessions: [{ _id: 'session', questions_cache: [{ ...question, question_id: 'old-one' }] }],
    pinnedquestions: [{ _id: 'pin', ...question, question_id: 'old-one' }],
  })
  expect(plan.changes.map(change => change.collection)).not.toContain('quizzes')
  expect(plan.changes.map(change => change.collection)).not.toContain('quizsessions')
  expect(plan.changes.map(change => change.collection)).not.toContain('pinnedquestions')
  expect(plan.conflicts.filter(conflict => conflict.reason === 'ambiguous-canonical-identity')).toHaveLength(3)
})
test('blocks externally audited answer-key and legacy-alias conflicts', () => {
  const canonicalId = getQuestionIdentity(question).question_id
  const plan = buildIdentityPlan({
    quizzes: [{ _id: 'quiz', questions: [{ ...question }] }],
  }, [canonicalId])
  expect(plan.changes).toHaveLength(0)
  expect(plan.conflicts).toContainEqual(expect.objectContaining({ reason: 'ambiguous-canonical-identity', canonicalId: expect.any(String) }))
})
test('blocks a canonical ID that would collide with another question legacy ID', () => {
  const canonicalId = getQuestionIdentity(question).question_id
  const legacyOwner = { ...question, _id: 'legacy-owner', text: 'Different prompt', question_id: canonicalId }
  const plan = buildIdentityPlan({
    questions: [legacyOwner],
    quizsessions: [{ _id: 'session', questions_cache: [{ ...question, question_id: undefined }] }],
  })
  expect(plan.changes.map(change => change.collection)).not.toContain('quizsessions')
  expect(plan.conflicts).toContainEqual(expect.objectContaining({ reason: 'legacy-id-namespace-collision', canonicalId }))
})
test('apply and rollback use field-level preconditions and report concurrent edits', async () => {
  const change = buildIdentityPlan({ quizzes: [{ _id: 'quiz', questions: [question] }] }).changes[0]
  const updateOne = jest.fn().mockResolvedValue({ matchedCount: 0 })
  const db = { collection: () => ({ updateOne }) }
  expect(await applyIdentityChanges(db, [change], 'migration-1')).toEqual({ applied: 0, skipped: 1 })
  expect(updateOne.mock.calls[0][0]['questions.0.text']).toEqual(question.text)
  expect(updateOne.mock.calls[0][1]).not.toHaveProperty('$set.questions')
  expect(await restoreIdentityChanges(db, [change], 'migration-1')).toEqual({ applied: 0, skipped: 1 })
  expect(updateOne.mock.calls[1][0]['questions.0.question_id']).toEqual(change.set['questions.0.question_id'])
  expect(updateOne.mock.calls[1][0]._question_identity_migration).toBe('migration-1:0')
})

test('resumes an operation already committed by this exact migration and reports durable outcomes', async () => {
  const changes = buildIdentityPlan({ quizzes: [{ _id: 'quiz', questions: [question] }] }).changes
  const onResult = jest.fn()
  const updateOne = jest.fn().mockResolvedValue({ matchedCount: 0 })
  const findOne = jest.fn().mockResolvedValue({ _id: 'quiz' })
  const result = await applyIdentityChanges({ collection: () => ({ updateOne, findOne }) }, changes, 'migration-1', onResult)
  expect(result).toEqual({ applied: 1, skipped: 0 })
  expect(findOne.mock.calls[0][0]._question_identity_migration).toBe('migration-1:0')
  expect(onResult).toHaveBeenLastCalledWith(0, 'applied')
})
