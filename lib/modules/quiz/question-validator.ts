import type { IQuestion } from '@/lib/modules/quiz/types/quiz'

/**
 * Kết quả validation cho một câu hỏi.
 */
export interface QuestionValidationResult {
  valid: boolean
  errors: QuestionValidationError[]
  warnings: string[]
}

export interface QuestionValidationError {
  code:
    | 'EMPTY_TEXT'
    | 'EMPTY_OPTIONS'
    | 'INSUFFICIENT_OPTIONS'
    | 'DUPLICATE_OPTIONS'
    | 'EMPTY_OPTION'
    | 'MISSING_CORRECT_ANSWER'
    | 'INVALID_CORRECT_ANSWER_INDEX'
  message: string
}

/**
 * Validate một câu hỏi trước khi migrate.
 * Trả về danh sách lỗi + cảnh báo.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export function validateQuestion(q: {
  text: string
  options: string[]
  correct_answer: number | number[]
}): QuestionValidationResult {
  const errors: QuestionValidationError[] = []
  const warnings: string[] = []
  const answers = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer]

  // 1. Text rỗng
  if (!q.text || q.text.trim().length === 0) {
    errors.push({ code: 'EMPTY_TEXT', message: 'Question text is empty' })
  }

  // 2. Options
  if (!q.options || q.options.length === 0) {
    errors.push({ code: 'EMPTY_OPTIONS', message: 'Options array is empty' })
  } else {
    // 2a. Ít hơn 2 options
    if (q.options.length < 2) {
      errors.push({ code: 'INSUFFICIENT_OPTIONS', message: `Only ${q.options.length} option(s), need at least 2` })
    }

    // 2b. Option rỗng
    const trimmedOpts = q.options.map((o) => o.trim())
    const emptyIdx = trimmedOpts.findIndex((o) => o.length === 0)
    if (emptyIdx >= 0) {
      errors.push({ code: 'EMPTY_OPTION', message: `Option #${emptyIdx + 1} is empty or whitespace-only` })
    }

    // 2c. Duplicate options (sau khi trim + lowercase)
    const normalized = trimmedOpts.map((o) => o.toLowerCase())
    const seen = new Set<string>()
    for (const opt of normalized) {
      if (seen.has(opt)) {
        errors.push({ code: 'DUPLICATE_OPTIONS', message: `Duplicate option detected: "${opt}"` })
        break
      }
      seen.add(opt)
    }

    // 3. Correct answer
    if (answers.length === 0 || answers.every((a) => a === undefined || a === null)) {
      errors.push({ code: 'MISSING_CORRECT_ANSWER', message: 'No correct answer specified' })
    } else {
      for (const idx of answers) {
        if (idx < 0 || idx >= q.options.length) {
          errors.push({
            code: 'INVALID_CORRECT_ANSWER_INDEX',
            message: `Correct answer index ${idx} is out of bounds (options length: ${q.options.length})`,
          })
        }
      }
    }
  }

  // Warnings
  if (q.text && q.text.trim().length < 5) {
    warnings.push('Question text is very short (< 5 characters)')
  }
  if (q.options && q.options.some((o) => o.trim().length > 500)) {
    warnings.push('Some options are very long (> 500 characters)')
  }
  if (answers.length > 1) {
    warnings.push(`Multi-answer question: ${answers.length} correct answers`)
  }

  const valid = errors.length === 0

  return { valid, errors, warnings }
}

/**
 * Tóm tắt validation thành object để log.
 */
export function summarizeValidation(questions: Array<{
  text: string
  options: string[]
  correct_answer: number | number[]
}>): {
  total: number
  valid: number
  invalid: number
  errorCounts: Record<string, number>
} {
  let valid = 0
  let invalid = 0
  const errorCounts: Record<string, number> = {}

  for (const q of questions) {
    const result = validateQuestion(q)
    if (result.valid) {
      valid++
    } else {
      invalid++
      for (const err of result.errors) {
        errorCounts[err.code] = (errorCounts[err.code] || 0) + 1
      }
    }
  }

  return { total: questions.length, valid, invalid, errorCounts }
}
