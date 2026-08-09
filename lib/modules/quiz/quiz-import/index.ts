import { normalizeImportedQuiz } from '@/lib/modules/quiz/quiz-import/normalizer'
import { parseImportPayload } from '@/lib/modules/quiz/quiz-import/parser'
import { validateImportedQuiz } from '@/lib/modules/quiz/quiz-import/validator'

export function buildQuizImportPreview(
  input: unknown,
  context?: { category_id?: string; course_code?: string; description?: string }
) {
  const parsed = parseImportPayload(input)
  const normalized = normalizeImportedQuiz(parsed)
  return validateImportedQuiz(parsed, normalized, context)
}

export * from '@/lib/modules/quiz/quiz-import/types'
