import { normalizeImportedQuiz } from './normalizer'
import { parseImportPayload } from './parser'
import { validateImportedQuiz } from './validator'

export function buildQuizImportPreview(input: unknown) {
  const parsed = parseImportPayload(input)
  const normalized = normalizeImportedQuiz(parsed)
  return validateImportedQuiz(parsed, normalized)
}

export * from './types'
