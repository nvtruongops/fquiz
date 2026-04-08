import type { ImportRawQuizPayload } from './types'

export function parseImportPayload(input: unknown): ImportRawQuizPayload {
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input)
      return ensureObject(parsed)
    } catch {
      const textParsed = parsePlainTextQuiz(input)
      if (textParsed) return textParsed
      throw new Error('INVALID_JSON')
    }
  }

  return ensureObject(input)
}

function ensureObject(input: unknown): ImportRawQuizPayload {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('INVALID_PAYLOAD_SHAPE')
  }
  return input as ImportRawQuizPayload
}

function splitAnswerTokens(value: string): string[] {
  return value
    .split(/[,\s;|]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parsePlainTextQuiz(content: string): ImportRawQuizPayload | null {
  const lines = content
    .replace(/\r/g, '')
    .split('\n')
  if (lines.every((line) => line.trim().length === 0)) return null

  const quizMeta: Record<string, string> = {}
  const questions: Array<Record<string, unknown>> = []
  let currentQuestion: Record<string, unknown> | null = null
  let questionCount = 0

  const questionStartRegex = /^(câu|question)\s*(\d+)\s*:?$/i
  const optionRegex = /^([A-Fa-f])\.\s*(.+)$/
  const answerRegex = /^(đáp án|dap an|answer)\s*:\s*(.+)$/i
  const explanationRegex = /^(mô tả|mo ta|explanation)\s*:\s*(.*)$/i
  const questionTextRegex = /^(câu hỏi|cau hoi|question)\s*:\s*(.+)$/i
  const categoryRegex = /^(category_id|category|môn học|mon hoc)\s*:\s*(.+)$/i
  const courseRegex = /^(course_code|quiz_code|quiz code|fquiz_code|fquiz code|mã quiz|ma quiz|mã đề|ma de)\s*:\s*(.+)$/i
  const descriptionRegex = /^(description|quiz_description|quiz description|mô tả quiz|mo ta quiz)\s*:\s*(.+)$/i

  const flush = () => {
    if (!currentQuestion) return
    questions.push(currentQuestion)
    currentQuestion = null
  }

  let collectingExplanation = false
  let collectingQuestionText = false

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      if (currentQuestion && collectingExplanation) {
        const wrapperKey = Object.keys(currentQuestion)[0]
        const body = currentQuestion[wrapperKey] as Record<string, unknown>
        const prev = typeof body.explanation === 'string' ? body.explanation : ''
        body.explanation = prev ? `${prev}\n` : '\n'
      } else if (currentQuestion && collectingQuestionText) {
        const wrapperKey = Object.keys(currentQuestion)[0]
        const body = currentQuestion[wrapperKey] as Record<string, unknown>
        const prev = typeof body.question === 'string' ? body.question : ''
        body.question = prev ? `${prev}\n` : '\n'
      }
      continue
    }

    const questionStart = line.match(questionStartRegex)
    if (questionStart) {
      flush()
      questionCount += 1
      collectingExplanation = false
      collectingQuestionText = false
      currentQuestion = {
        [`Câu ${questionStart[2] || questionCount}`]: {
          question: '',
          options: [],
          correct_answer: [],
        },
      }
      continue
    }

    const cat = line.match(categoryRegex)
    if (cat) {
      quizMeta.category_id = cat[2].trim()
      collectingExplanation = false
      collectingQuestionText = false
      continue
    }
    const course = line.match(courseRegex)
    if (course) {
      quizMeta.course_code = course[2].trim()
      collectingExplanation = false
      collectingQuestionText = false
      continue
    }
    const desc = line.match(descriptionRegex)
    if (desc) {
      quizMeta.description = desc[2].trim()
      collectingExplanation = false
      collectingQuestionText = false
      continue
    }

    if (!currentQuestion) continue
    const wrapperKey = Object.keys(currentQuestion)[0]
    const body = currentQuestion[wrapperKey] as Record<string, unknown>

    if (collectingExplanation) {
      const prev = typeof body.explanation === 'string' ? body.explanation : ''
      body.explanation = prev ? `${prev}\n${line}` : line
      continue
    }

    const questionText = line.match(questionTextRegex)
    if (questionText) {
      body.question = questionText[2].trim()
      collectingExplanation = false
      collectingQuestionText = true
      continue
    }

    const option = line.match(optionRegex)
    if (option) {
      const options = (body.options as string[]) ?? []
      options.push(`[${option[1].toUpperCase()}]"${option[2].trim()}"`)
      body.options = options
      collectingExplanation = false
      collectingQuestionText = false
      continue
    }

    const answer = line.match(answerRegex)
    if (answer) {
      body.correct_answer = splitAnswerTokens(answer[2])
      collectingExplanation = false
      collectingQuestionText = false
      continue
    }

    const explanation = line.match(explanationRegex)
    if (explanation) {
      const value = explanation[2].trim()
      if (value) {
        body.explanation = value
      } else {
        body.explanation = ''
      }
      collectingExplanation = true
      collectingQuestionText = false
      continue
    }

    if (collectingQuestionText) {
      const prev = typeof body.question === 'string' ? body.question : ''
      body.question = prev ? `${prev}\n${line}` : line
      continue
    }
  }

  flush()
  if (questions.length === 0) return null

  return {
    quizMeta,
    questions,
  }
}
