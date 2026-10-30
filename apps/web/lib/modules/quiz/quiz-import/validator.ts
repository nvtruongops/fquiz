import { validateObjectId } from '@/lib/core/schemas/common'
import {
  COURSE_CODE_ALLOWED_MESSAGE,
  COURSE_CODE_MAX_LENGTH,
  COURSE_CODE_MAX_LENGTH_MESSAGE,
  COURSE_CODE_PATTERN,
} from '@/lib/modules/quiz/schemas/quiz'
import { checkDuplicateQuestions } from '@/lib/modules/quiz/quiz-import/duplicate-checker'
import type {
  ImportDiagnostic,
  ImportPreviewResult,
  ImportRawQuestion,
  ImportRawQuizPayload,
  NormalizedQuiz,
} from '@/lib/modules/quiz/quiz-import/types'
import { getExplicitAnswerSelectionCount } from '@fquiz/models'

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

export function validateImportedQuiz(
  raw: ImportRawQuizPayload,
  normalized: NormalizedQuiz,
  context?: { category_id?: string; course_code?: string; description?: string }
): ImportPreviewResult {
  const diagnostics: ImportDiagnostic[] = []

  validateTopLevel(raw, diagnostics)
  validateMetadata(raw, normalized, diagnostics, context)
  
  if (normalized.questions.length === 0) {
    diagnostics.push(diagnostic('error', 'NO_QUESTIONS', 'At least 1 question is required', { field: 'questions' }))
  }

  normalized.questions.forEach((question, index) => {
    validateSingleQuestion(question, index, raw, diagnostics)
  })

  // Check for duplicate questions within the quiz
  const duplicateDiagnostics = checkDuplicateQuestions(normalized.questions)
  diagnostics.push(...duplicateDiagnostics)

  return finalizePreview(normalized, diagnostics)
}

function validateTopLevel(raw: ImportRawQuizPayload, diagnostics: ImportDiagnostic[]) {
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_TOP_KEYS.has(key)) {
      diagnostics.push(diagnostic('error', 'UNKNOWN_TOP_LEVEL_FIELD', `Disallowed field: ${key}`, { field: key }))
    }
  }

  if (!raw.quizMeta || typeof raw.quizMeta !== 'object' || Array.isArray(raw.quizMeta)) {
    diagnostics.push(diagnostic('error', 'MISSING_QUIZ_META', 'Missing or invalid quizMeta', { field: 'quizMeta' }))
  } else {
    for (const key of Object.keys(raw.quizMeta)) {
      if (!ALLOWED_META_KEYS.has(key)) {
        diagnostics.push(diagnostic('error', 'UNKNOWN_QUIZ_META_FIELD', `Invalid quizMeta field: ${key}`, { field: `quizMeta.${key}` }))
      }
    }
  }

  if (!Array.isArray(raw.questions)) {
    diagnostics.push(diagnostic('error', 'INVALID_QUESTIONS_ARRAY', 'questions must be an array', { field: 'questions' }))
  }
}

import { analyzeQuestionStructure } from '@/lib/modules/quiz/quiz-import/analyzer'

function validateMetadata(
  raw: ImportRawQuizPayload,
  normalized: NormalizedQuiz,
  diagnostics: ImportDiagnostic[],
  context?: { category_id?: string; course_code?: string; description?: string }
) {
  const hasCourseCode = !!(normalized.course_code || context?.course_code)
  const hasCategoryId = !!(normalized.category_id || context?.category_id)
  const hasDescription = !!(normalized.description || context?.description)

  if (!hasCourseCode) {
    diagnostics.push(diagnostic('warning', 'MISSING_COURSE_CODE', 'Missing course code (quizMeta.course_code) - can be manually entered before saving', { field: 'quizMeta.course_code' }))
  } else if (normalized.course_code && normalized.course_code.length > COURSE_CODE_MAX_LENGTH) {
    diagnostics.push(diagnostic('error', 'COURSE_CODE_TOO_LONG', COURSE_CODE_MAX_LENGTH_MESSAGE, { field: 'quizMeta.course_code' }))
  } else if (normalized.course_code && !COURSE_CODE_PATTERN.test(normalized.course_code)) {
    diagnostics.push(diagnostic('error', 'INVALID_COURSE_CODE', COURSE_CODE_ALLOWED_MESSAGE, { field: 'quizMeta.course_code' }))
  }

  if (!hasCategoryId) {
    diagnostics.push(diagnostic('warning', 'MISSING_CATEGORY_ID', 'Missing category_id - can select course in form before saving', { field: 'quizMeta.category_id' }))
  }

  if (!hasDescription) {
    diagnostics.push(diagnostic('warning', 'MISSING_DESCRIPTION', 'Missing quiz description (quizMeta.description) - can be omitted or added in form', { field: 'quizMeta.description' }))
  }

  if (normalized.category_id && !validateObjectId(normalized.category_id)) {
    diagnostics.push(diagnostic('warning', 'CATEGORY_ID_NOT_OBJECT_ID', 'category_id is not a valid ObjectId, please reselect the course before saving', { field: 'quizMeta.category_id' }))
  }
}

function validateSingleQuestion(question: any, index: number, raw: ImportRawQuizPayload, diagnostics: ImportDiagnostic[]) {
  const sourceQuestion = (Array.isArray(raw.questions) ? raw.questions[index] : {}) as ImportRawQuestion
  const candidate = getCandidateQuestion(sourceQuestion)

  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
    for (const key of Object.keys(candidate)) {
      if (!ALLOWED_QUESTION_KEYS.has(key)) {
        diagnostics.push(diagnostic('warning', 'UNKNOWN_QUESTION_FIELD', `Question ${index + 1} has unexpected field: ${key}`, { questionIndex: index, field: `questions[${index}].${key}` }))
      }
    }
  }

  if (!question.text) {
    diagnostics.push(diagnostic('error', 'MISSING_QUESTION_TEXT', 'Question text is missing', { questionIndex: index, field: `questions[${index}].text` }))
  }
  if (question.options.length < 2) {
    diagnostics.push(diagnostic('error', 'INSUFFICIENT_OPTIONS', 'Question requires at least 2 options', { questionIndex: index, field: `questions[${index}].options` }))
  }
  
  validateAnswers(question, index, diagnostics)
  validateOptions(question, index, diagnostics)
}

function getCandidateQuestion(source: any): ImportRawQuestion {
  if (source && typeof source === 'object' && !Array.isArray(source) && Object.keys(source).length === 1) {
    const key = Object.keys(source)[0]
    if (/^câu\s*\d+$/i.test(key) && source[key] && typeof source[key] === 'object') {
      return source[key] as ImportRawQuestion
    }
  }
  return source as ImportRawQuestion
}

function validateRequestedAnswerCount(question: any, index: number, diagnostics: ImportDiagnostic[]) {
  const requestedCount = getExplicitAnswerSelectionCount(question.text)
  const answers = Array.isArray(question.correct_answer) ? question.correct_answer : [question.correct_answer]
  if (requestedCount === null || requestedCount === answers.length) return

  diagnostics.push(diagnostic(
    'error',
    'CORRECT_ANSWER_COUNT_MISMATCH',
    `Question text requests ${requestedCount} correct answers, but ${answers.length} are marked`,
    { questionIndex: index, field: `questions[${index}].correct_answer` }
  ))
}

function validateAnswers(question: any, index: number, diagnostics: ImportDiagnostic[]) {
  const answers = Array.isArray(question.correct_answer) ? question.correct_answer : [question.correct_answer]
  if (answers.length === 0) {
    diagnostics.push(diagnostic('error', 'MISSING_CORRECT_ANSWER', 'No correct answer selected', { questionIndex: index, field: `questions[${index}].correct_answer` }))
  }

  validateRequestedAnswerCount(question, index, diagnostics)

  if (answers.some((answerIndex: number) => answerIndex >= question.options.length)) {
    diagnostics.push(diagnostic('error', 'CORRECT_ANSWER_OUT_OF_RANGE', 'Correct answer index exceeds the number of options', { questionIndex: index, field: `questions[${index}].correct_answer` }))
  }

  const uniqueAnswers = new Set(answers)
  if (uniqueAnswers.size !== answers.length) {
    diagnostics.push(diagnostic('error', 'DUPLICATE_CORRECT_ANSWER', 'Duplicate correct answers (e.g. C, C)', { questionIndex: index, field: `questions[${index}].correct_answer` }))
  }
}

function validateOptions(question: any, index: number, diagnostics: ImportDiagnostic[]) {
  const hasEmptyMiddleOption = question.options.slice(0, -1).some((option: string) => !option)
  if (hasEmptyMiddleOption) {
    diagnostics.push(diagnostic('warning', 'EMPTY_OPTION_IN_MIDDLE', 'Empty option in the middle of options list', { questionIndex: index, field: `questions[${index}].options` }))
  }

  const seen = new Set<string>()
  const hasDuplicateOption = question.options.some((option: string) => {
    const key = option.toLowerCase()
    if (seen.has(key)) return true
    seen.add(key)
    return false
  })
  if (hasDuplicateOption) {
    diagnostics.push(diagnostic('warning', 'DUPLICATE_OPTION', 'Duplicate options detected', { questionIndex: index, field: `questions[${index}].options` }))
  }
}

function finalizePreview(normalized: NormalizedQuiz, diagnostics: ImportDiagnostic[]): ImportPreviewResult {
  const invalidQuestions = normalized.questions.reduce((total, _, index) => total + (hasQuestionError(diagnostics, index) ? 1 : 0), 0)
  const summary = {
    totalQuestions: normalized.questions.length,
    validQuestions: normalized.questions.length - invalidQuestions,
    invalidQuestions,
    errors: diagnostics.filter((item) => item.level === 'error').length,
    warnings: diagnostics.filter((item) => item.level === 'warning').length,
  }

  const structureReport = analyzeQuestionStructure(normalized.questions)

  return {
    normalizedQuiz: normalized,
    diagnostics,
    summary,
    isValid: summary.errors === 0,
    structureReport,
  }
}
