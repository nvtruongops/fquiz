import { SyncQuestionUpdateSchema } from '../schemas/quiz'
import { z } from 'zod'
import { resolveQuestionBankRevision } from './question-identity'

type SyncQuestionData = z.infer<typeof SyncQuestionUpdateSchema>
type QuestionIdFactory = (question: SyncQuestionData['new_question']) => string
type DatabaseConnector = () => Promise<unknown>

export async function prepareQuestionSyncRequest(
  body: unknown,
  connect: DatabaseConnector,
  createQuestionId: QuestionIdFactory,
  questionBankModel: Parameters<typeof resolveQuestionBankRevision>[0],
) {
  const parsed = SyncQuestionUpdateSchema.safeParse(body)
  if (!parsed.success) return { success: false as const, issues: parsed.error.issues }

  await connect()
  const { category_id, old_question_id, new_question } = parsed.data
  const effectiveOldId = old_question_id || createQuestionId(new_question)
  const { previous, identity, conflict } = await resolveQuestionBankRevision(
    questionBankModel, category_id, effectiveOldId, new_question,
  )
  return {
    success: true as const,
    category_id,
    effectiveOldId,
    newQuestion: new_question,
    oldQuestion: previous,
    revision: identity,
    conflict,
  }
}
