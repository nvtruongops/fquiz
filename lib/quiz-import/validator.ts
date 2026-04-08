import { validateObjectId } from '@/lib/schemas'
import type {
  ImportDiagnostic,
  ImportPreviewResult,
  ImportRawQuestion,
  ImportRawQuizPayload,
  NormalizedQuiz,
} from './types'

const ALLOWED_TOP_KEYS = new Set(['quizMeta', 'questions'])
const ALLOWED_META_KEYS = new Set(['course_code', 'category_id', 'title', 'description'])
const ALLOWED_QUESTION_KEYS = new Set([
  'text',
  'question',
  'câu hỏi',
  'cau hoi',
  'options',
  'correct_answer',
  'correct_answers',
  'explanation',
  'image_url',
])

function diagnostic(
  level: 'error' | 'warning',
  code: string,
  message: string,
  extras?: Pick<ImportDiagnostic, 'questionIndex' | 'field'>
): ImportDiagnostic {
  return { level, code, message, ...extras }
}

function hasQuestionError(diags: ImportDiagnostic[], questionIndex: number): boolean {
  return diags.some((item) => item.level === 'error' && item.questionIndex === questionIndex)
}

export function validateImportedQuiz(raw: ImportRawQuizPayload, normalized: NormalizedQuiz): ImportPreviewResult {
  const diagnostics: ImportDiagnostic[] = []

  for (const key of Object.keys(raw)) {
    if (!ALLOWED_TOP_KEYS.has(key)) {
      diagnostics.push(diagnostic('error', 'UNKNOWN_TOP_LEVEL_FIELD', `Trường không được phép: ${key}`, { field: key }))
    }
  }

  if (!raw.quizMeta || typeof raw.quizMeta !== 'object' || Array.isArray(raw.quizMeta)) {
    diagnostics.push(diagnostic('error', 'MISSING_QUIZ_META', 'Thiếu quizMeta hoặc quizMeta không hợp lệ', { field: 'quizMeta' }))
  } else {
    for (const key of Object.keys(raw.quizMeta)) {
      if (!ALLOWED_META_KEYS.has(key)) {
        diagnostics.push(diagnostic('error', 'UNKNOWN_QUIZ_META_FIELD', `Trường quizMeta không hợp lệ: ${key}`, { field: `quizMeta.${key}` }))
      }
    }
  }

  if (!Array.isArray(raw.questions)) {
    diagnostics.push(diagnostic('error', 'INVALID_QUESTIONS_ARRAY', 'questions phải là mảng', { field: 'questions' }))
  }

  if (!normalized.course_code) {
    diagnostics.push(
      diagnostic(
        'warning',
        'MISSING_COURSE_CODE',
        'Thiếu Fquiz code (quizMeta.course_code) - có thể nhập thủ công trong form trước khi lưu',
        { field: 'quizMeta.course_code' }
      )
    )
  }

  if (!normalized.category_id) {
    diagnostics.push(
      diagnostic(
        'warning',
        'MISSING_CATEGORY_ID',
        'Thiếu category_id - có thể chọn môn học trong form trước khi lưu',
        { field: 'quizMeta.category_id' }
      )
    )
  }

  if (!normalized.description) {
    diagnostics.push(
      diagnostic(
        'warning',
        'MISSING_DESCRIPTION',
        'Thiếu quiz description (quizMeta.description) - có thể bỏ qua hoặc nhập thêm trong form',
        { field: 'quizMeta.description' }
      )
    )
  }

  if (normalized.category_id && !validateObjectId(normalized.category_id)) {
    diagnostics.push(
      diagnostic(
        'warning',
        'CATEGORY_ID_NOT_OBJECT_ID',
        'category_id không đúng định dạng ObjectId, hãy chọn lại môn học trước khi lưu',
        { field: 'quizMeta.category_id' }
      )
    )
  }

  if (normalized.questions.length === 0) {
    diagnostics.push(diagnostic('error', 'NO_QUESTIONS', 'Cần ít nhất 1 câu hỏi', { field: 'questions' }))
  }

  normalized.questions.forEach((question, index) => {
    const sourceQuestion = (Array.isArray(raw.questions) ? raw.questions[index] : {}) as ImportRawQuestion

    const candidate =
      sourceQuestion &&
      typeof sourceQuestion === 'object' &&
      !Array.isArray(sourceQuestion) &&
      Object.keys(sourceQuestion).length === 1 &&
      /^câu\s*\d+$/i.test(Object.keys(sourceQuestion)[0]) &&
      sourceQuestion[Object.keys(sourceQuestion)[0]] &&
      typeof sourceQuestion[Object.keys(sourceQuestion)[0]] === 'object'
        ? (sourceQuestion[Object.keys(sourceQuestion)[0]] as ImportRawQuestion)
        : sourceQuestion

    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      for (const key of Object.keys(candidate)) {
        if (!ALLOWED_QUESTION_KEYS.has(key)) {
          diagnostics.push(
            diagnostic('warning', 'UNKNOWN_QUESTION_FIELD', `Câu ${index + 1} có trường dư thừa: ${key}`, {
              questionIndex: index,
              field: `questions[${index}].${key}`,
            })
          )
        }
      }
    }

    if (!question.text) {
      diagnostics.push(diagnostic('error', 'MISSING_QUESTION_TEXT', 'Thiếu nội dung câu hỏi', { questionIndex: index, field: `questions[${index}].text` }))
    }

    if (question.options.length < 2) {
      diagnostics.push(diagnostic('error', 'INSUFFICIENT_OPTIONS', 'Câu hỏi cần ít nhất 2 đáp án', { questionIndex: index, field: `questions[${index}].options` }))
    }

    if (question.correct_answer.length === 0) {
      diagnostics.push(diagnostic('error', 'MISSING_CORRECT_ANSWER', 'Chưa có đáp án đúng', { questionIndex: index, field: `questions[${index}].correct_answer` }))
    }

    if (question.correct_answer.some((answerIndex) => answerIndex >= question.options.length)) {
      diagnostics.push(
        diagnostic('error', 'CORRECT_ANSWER_OUT_OF_RANGE', 'Chỉ số đáp án đúng vượt quá số lượng options', {
          questionIndex: index,
          field: `questions[${index}].correct_answer`,
        })
      )
    }

    const uniqueAnswers = new Set(question.correct_answer)
    if (uniqueAnswers.size !== question.correct_answer.length) {
      diagnostics.push(
        diagnostic('error', 'DUPLICATE_CORRECT_ANSWER', 'Đáp án đúng bị trùng lặp (ví dụ: C, C)', {
          questionIndex: index,
          field: `questions[${index}].correct_answer`,
        })
      )
    }

    const hasEmptyMiddleOption = question.options.slice(0, -1).some((option) => !option)
    if (hasEmptyMiddleOption) {
      diagnostics.push(diagnostic('warning', 'EMPTY_OPTION_IN_MIDDLE', 'Có option rỗng ở giữa danh sách', { questionIndex: index, field: `questions[${index}].options` }))
    }

    const seen = new Set<string>()
    const hasDuplicateOption = question.options.some((option) => {
      const key = option.toLowerCase()
      if (seen.has(key)) return true
      seen.add(key)
      return false
    })
    if (hasDuplicateOption) {
      diagnostics.push(diagnostic('warning', 'DUPLICATE_OPTION', 'Có option bị trùng lặp', { questionIndex: index, field: `questions[${index}].options` }))
    }
  })

  const invalidQuestions = normalized.questions.reduce((total, _, index) => total + (hasQuestionError(diagnostics, index) ? 1 : 0), 0)
  const summary = {
    totalQuestions: normalized.questions.length,
    validQuestions: normalized.questions.length - invalidQuestions,
    invalidQuestions,
    errors: diagnostics.filter((item) => item.level === 'error').length,
    warnings: diagnostics.filter((item) => item.level === 'warning').length,
  }

  return {
    normalizedQuiz: normalized,
    diagnostics,
    summary,
    isValid: summary.errors === 0,
  }
}
