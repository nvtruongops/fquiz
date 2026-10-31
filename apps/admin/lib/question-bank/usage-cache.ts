import { Question, rebuildQuestionBankUsageFromModels } from '@fquiz/models'
import { QuestionBank } from '@/lib/models/QuestionBank'
import { Quiz } from '@/lib/models/Quiz'

/** Keep the admin bank cache aligned with the authoritative quiz/reference documents. */
export async function refreshQuestionBankUsageCache(): Promise<boolean> {
  try {
    await rebuildQuestionBankUsageFromModels(Quiz, Question, QuestionBank)
    return true
  } catch (error) {
    console.error('Question bank usage refresh failed; retry reconciliation:', error)
    return false
  }
}
