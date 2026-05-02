import type { ImportRawQuestion, ImportRawQuizPayload, NormalizedQuestion, NormalizedQuiz } from './types'

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeOptionLabel(value: string): string {
  return value
    .replace(/^\s*\[[A-Za-z]\]\s*/, '')
    .replace(/^"(.*)"$/, '$1')
    .trim()
}

function normalizeOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const trimmed = value.map((item) => normalizeOptionLabel(normalizeString(item)))
  let last = trimmed.length - 1
  while (last >= 0 && trimmed[last] === '') last--
  return trimmed.slice(0, last + 1)
}

function parseAnswerToken(value: unknown): number {
  if (typeof value === 'number') return value
  const raw = normalizeString(value).replace(/^\[|\]$/g, '').trim()
  if (!raw) return Number.NaN
  if (/^\d+$/.test(raw)) return Number(raw)
  if (/^[A-Za-z]$/.test(raw)) return raw.toUpperCase().charCodeAt(0) - 65
  return Number.NaN
}

function splitAnswerTokens(value: string): string[] {
  return value
    .split(/[,\s;|]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeCorrectAnswers(question: ImportRawQuestion): number[] {
  const source = Array.isArray(question.correct_answer)
    ? question.correct_answer
    : Array.isArray(question.correct_answers)
      ? question.correct_answers
      : typeof question.correct_answer === 'string'
        ? splitAnswerTokens(question.correct_answer)
      : []
  return source
    .map((value) => parseAnswerToken(value))
    .filter((value) => Number.isInteger(value) && value >= 0)
}

function normalizeQuestionText(question: ImportRawQuestion): string {
  return normalizeString(
    question.text ??
      question['câu hỏi'] ??
      question['cau hoi'] ??
      question.question
  )
}

function extractQuestionNo(key: string): number | undefined {
  const m = key.match(/^(câu|question)\s*(\d+)\s*$/i)
  if (!m) return undefined
  const n = Number(m[2])
  return Number.isInteger(n) && n > 0 ? n : undefined
}

function unwrapQuestionShape(question: ImportRawQuestion): { source: ImportRawQuestion; questionNo?: number } {
  const keys = Object.keys(question)
  if (keys.length === 1 && /^(câu|question)\s*\d+$/i.test(keys[0])) {
    const nested = question[keys[0]]
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return { source: nested as ImportRawQuestion, questionNo: extractQuestionNo(keys[0]) }
    }
  }
  return { source: question }
}

function normalizeQuestion(question: ImportRawQuestion): NormalizedQuestion {
  const { source, questionNo } = unwrapQuestionShape(question)
  const normalized: NormalizedQuestion = {
    text: normalizeQuestionText(source),
    options: normalizeOptions(source.options),
    correct_answer: normalizeCorrectAnswers(source),
    ...(questionNo ? { question_no: questionNo } : {}),
  }

  const explanation = normalizeString(source.explanation)
  if (explanation) normalized.explanation = explanation

  const imageUrl = normalizeString(source.image_url)
  if (imageUrl) normalized.image_url = imageUrl

  return normalized
}

export function normalizeImportedQuiz(raw: ImportRawQuizPayload): NormalizedQuiz {
  const meta = raw.quizMeta && typeof raw.quizMeta === 'object' ? raw.quizMeta : {}
  const courseCode = normalizeString(meta.course_code).toUpperCase()
  const title = normalizeString(meta.title)
  const description = normalizeString(meta.description)
  const categoryId = normalizeString(meta.category_id)

  const rawQuestions = Array.isArray(raw.questions)
    ? raw.questions
    : raw.questions && typeof raw.questions === 'object'
      ? Object.values(raw.questions as Record<string, unknown>)
      : []
  const questions = rawQuestions
    .filter((item): item is ImportRawQuestion => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .map((question) => normalizeQuestion(question))

  // Add question_id to each question for deduplication
  const questionsWithIds = questions.map(q => {
    // Import generateQuestionId at the top of the file
    const { generateQuestionId } = require('@/lib/question-id-generator')
    return {
      ...q,
      question_id: generateQuestionId({
        text: q.text,
        options: q.options,
        correct_answer: q.correct_answer
      })
    }
  })

  return {
    title,
    description,
    course_code: courseCode,
    ...(categoryId ? { category_id: categoryId } : {}),
    questions: questionsWithIds,
  }
}
