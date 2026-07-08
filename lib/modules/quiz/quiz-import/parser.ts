import type { ImportRawQuizPayload } from '@/lib/modules/quiz/quiz-import/types'

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
  collectingOptionIndex: number | null
}

function tryMatchMetadata(line: string, quizMeta: Record<string, string>): boolean {
  const colonIndex = line.indexOf(':')
  if (colonIndex === -1) return false

  const key = line.substring(0, colonIndex).trim().toLowerCase()
  const value = line.substring(colonIndex + 1).trim()

  const categoryKeys = ['category_id', 'category', 'môn học', 'mon hoc']
  const courseKeys = [
    'course_code',
    'quiz_code',
    'quiz code',
    'fquiz_code',
    'fquiz code',
    'mã quiz',
    'ma quiz',
    'mã đề',
    'ma de',
  ]
  const descriptionKeys = [
    'description',
    'quiz_description',
    'quiz description',
    'mô tả quiz',
    'mo ta quiz',
  ]

  if (categoryKeys.includes(key)) {
    if (!value) return false
    quizMeta.category_id = value
    return true
  }
  if (courseKeys.includes(key)) {
    if (!value) return false
    quizMeta.course_code = value
    return true
  }
  if (descriptionKeys.includes(key)) {
    if (!value) return false
    quizMeta.description = value
    return true
  }
  return false
}

function parsePlainTextQuiz(content: string): ImportRawQuizPayload | null {
  const lines = content.replaceAll('\r', '').split('\n')
  if (lines.every((line) => line.trim().length === 0)) return null

  const quizMeta: Record<string, string> = {}
  const questions: Array<Record<string, unknown>> = []
  const context: ParserContext = {
    currentQuestion: null,
    questionCount: 0,
    collectingExplanation: false,
    collectingQuestionText: false,
    collectingOptionIndex: null,
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
      context.collectingOptionIndex = null
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
    } else if (context.collectingOptionIndex !== null) {
      const options = body.options as string[]
      const idx = context.collectingOptionIndex
      const match = options[idx].match(/^(\[[A-Z]\])([\s\S]*)$/i)
      if (match) {
        options[idx] = `${match[1]}${match[2]}\n`
      }
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
    context.collectingOptionIndex = null
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

  if (context.collectingOptionIndex !== null) {
    const options = body.options as string[]
    const idx = context.collectingOptionIndex
    const match = options[idx].match(/^(\[[A-Z]\])([\s\S]*)$/i)
    if (match) {
      const prefix = match[1]
      const content = match[2]
      // Add newline before appending if not empty
      options[idx] = `${prefix}${content}${content ? '\n' : ''}${line}`
    }
    return true
  }
  return false
}

function tryMatchOption(line: string, body: Record<string, unknown>, context: ParserContext): boolean {
  if (line.length >= 2 && line[1] === '.') {
    const firstChar = line[0].toUpperCase()
    if (firstChar >= 'A' && firstChar <= 'F') {
      const optContent = line.substring(2).trim()
      const options = (body.options as string[]) ?? []
      options.push(`[${firstChar}]${optContent}`)
      body.options = options
      context.collectingExplanation = false
      context.collectingQuestionText = false
      context.collectingOptionIndex = options.length - 1
      return true
    }
  }
  return false
}

function tryMatchQuestionProperties(
  key: string,
  value: string,
  body: Record<string, unknown>,
  context: ParserContext
): boolean {
  if (['câu hỏi', 'cau hoi', 'question'].includes(key)) {
    if (!value) return false
    body.question = value
    context.collectingExplanation = false
    context.collectingQuestionText = true
    context.collectingOptionIndex = null
    return true
  }

  if (['đáp án', 'dap an', 'answer'].includes(key)) {
    if (!value) return false
    body.correct_answer = splitAnswerTokens(value)
    context.collectingExplanation = false
    context.collectingQuestionText = false
    context.collectingOptionIndex = null
    return true
  }

  if (['mô tả', 'mo ta', 'explanation'].includes(key)) {
    if (!value) return false
    body.explanation = value
    context.collectingExplanation = true
    context.collectingQuestionText = false
    context.collectingOptionIndex = null
    return true
  }

  return false
}

function handleStaticMatches(line: string, body: Record<string, unknown>, context: ParserContext): boolean {
  if (tryMatchOption(line, body, context)) return true

  const colonIndex = line.indexOf(':')
  if (colonIndex !== -1) {
    const key = line.substring(0, colonIndex).trim().toLowerCase()
    const value = line.substring(colonIndex + 1).trim()
    if (tryMatchQuestionProperties(key, value, body, context)) return true
  }

  return false
}

function getBody(question: Record<string, unknown>): Record<string, unknown> {
  const wrapperKey = Object.keys(question)[0]
  return question[wrapperKey] as Record<string, unknown>
}
