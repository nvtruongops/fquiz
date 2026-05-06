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

interface ParserContext {
  currentQuestion: Record<string, unknown> | null
  questionCount: number
  collectingExplanation: boolean
  collectingQuestionText: boolean
}

function tryMatchMetadata(line: string, quizMeta: Record<string, string>): boolean {
  const categoryRegex = /^(category_id|category|môn học|mon hoc)\s*:\s*(.+)$/i
  const courseRegex = /^(course_code|quiz_code|quiz code|fquiz_code|fquiz code|mã quiz|ma quiz|mã đề|ma de)\s*:\s*(.+)$/i
  const descriptionRegex = /^(description|quiz_description|quiz description|mô tả quiz|mo ta quiz)\s*:\s*(.+)$/i

  const catMatch = line.match(categoryRegex)
  if (catMatch) {
    quizMeta.category_id = catMatch[2].trim()
    return true
  }
  const courseMatch = line.match(courseRegex)
  if (courseMatch) {
    quizMeta.course_code = courseMatch[2].trim()
    return true
  }
  const descMatch = line.match(descriptionRegex)
  if (descMatch) {
    quizMeta.description = descMatch[2].trim()
    return true
  }
  return false
}

function parsePlainTextQuiz(content: string): ImportRawQuizPayload | null {
  const lines = content.replace(/\r/g, '').split('\n')
  if (lines.every((line) => line.trim().length === 0)) return null

  const quizMeta: Record<string, string> = {}
  const questions: Array<Record<string, unknown>> = []
  const context: ParserContext = {
    currentQuestion: null,
    questionCount: 0,
    collectingExplanation: false,
    collectingQuestionText: false,
  }

  const flush = () => {
    if (context.currentQuestion) questions.push(context.currentQuestion)
    context.currentQuestion = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (handleEmptyLine(line, context)) continue
    if (handleQuestionStart(line, context, flush)) continue
    if (tryMatchMetadata(line, quizMeta)) {
      context.collectingExplanation = false
      context.collectingQuestionText = false
      continue
    }
    if (handleQuestionBody(line, context)) continue
  }

  flush()
  return questions.length > 0 ? { quizMeta, questions } : null
}

function handleEmptyLine(line: string, context: ParserContext): boolean {
  if (line) return false
  if (context.currentQuestion) {
    const body = getBody(context.currentQuestion)
    if (context.collectingExplanation) {
      body.explanation = (body.explanation as string || '') + '\n'
    } else if (context.collectingQuestionText) {
      body.question = (body.question as string || '') + '\n'
    }
  }
  return true
}

function handleQuestionStart(line: string, context: ParserContext, flush: () => void): boolean {
  const questionStartRegex = /^(câu|question)\s*(\d+)\s*:?$/i
  const match = line.match(questionStartRegex)
  if (match) {
    flush()
    context.questionCount += 1
    context.collectingExplanation = false
    context.collectingQuestionText = false
    context.currentQuestion = {
      [`Câu ${match[2] || context.questionCount}`]: {
        question: '',
        options: [],
        correct_answer: [],
      },
    }
    return true
  }
  return false
}

function handleQuestionBody(line: string, context: ParserContext): boolean {
  if (!context.currentQuestion) return false
  const body = getBody(context.currentQuestion)

  if (context.collectingExplanation && !line.match(/^(đáp án|dap an|answer|mô tả|mo ta|explanation|câu hỏi|cau hoi|question)\s*:/i)) {
    body.explanation = (body.explanation as string || '') + (body.explanation ? '\n' : '') + line
    return true
  }

  if (handleStaticMatches(line, body, context)) return true

  if (context.collectingQuestionText) {
    body.question = (body.question as string || '') + (body.question ? '\n' : '') + line
    return true
  }
  return false
}

function handleStaticMatches(line: string, body: Record<string, unknown>, context: ParserContext): boolean {
  const optionRegex = /^([A-Fa-f])\.\s*(.+)$/
  const answerRegex = /^(đáp án|dap an|answer)\s*:\s*(.+)$/i
  const explanationRegex = /^(mô tả|mo ta|explanation)\s*:\s*(.*)$/i
  const questionTextRegex = /^(câu hỏi|cau hoi|question)\s*:\s*(.+)$/i

  const qText = line.match(questionTextRegex)
  if (qText) {
    body.question = qText[2].trim()
    context.collectingExplanation = false
    context.collectingQuestionText = true
    return true
  }

  const opt = line.match(optionRegex)
  if (opt) {
    const options = (body.options as string[]) ?? []
    options.push(`[${opt[1].toUpperCase()}]"${opt[2].trim()}"`)
    body.options = options
    context.collectingExplanation = false
    context.collectingQuestionText = false
    return true
  }

  const ans = line.match(answerRegex)
  if (ans) {
    body.correct_answer = splitAnswerTokens(ans[2])
    context.collectingExplanation = false
    context.collectingQuestionText = false
    return true
  }

  const exp = line.match(explanationRegex)
  if (exp) {
    body.explanation = exp[2].trim()
    context.collectingExplanation = true
    context.collectingQuestionText = false
    return true
  }

  return false
}

function getBody(question: Record<string, unknown>): Record<string, unknown> {
  const wrapperKey = Object.keys(question)[0]
  return question[wrapperKey] as Record<string, unknown>
}
