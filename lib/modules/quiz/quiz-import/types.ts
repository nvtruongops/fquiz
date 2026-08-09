export type ImportRole = 'admin' | 'student'

export type DiagnosticLevel = 'error' | 'warning'

export interface ImportDiagnostic {
  level: DiagnosticLevel
  code: string
  message: string
  questionIndex?: number
  field?: string
  metadata?: {
    questionId?: string
    duplicateIndices?: number[]
  }
}

export interface ImportSummary {
  totalQuestions: number
  validQuestions: number
  invalidQuestions: number
  errors: number
  warnings: number
}

export interface NormalizedQuestion {
  question_id?: string      // Content-based unique ID for deduplication
  text: string
  options: string[]
  correct_answer: number | number[]
  question_no?: number
  explanation?: string
  image_url?: string
}

export interface NormalizedQuiz {
  title: string
  description: string
  course_code: string
  category_id?: string
  questions: NormalizedQuestion[]
}

export interface QuestionStructureReport {
  total: number
  standardCount: number
  nonStandardCount: number
  singleCorrectCount: number
  multiCorrectCount: number
  multiCorrectBreakdown: Record<number, number>
  zeroCorrectCount: number
  fourOptionsCount: number
  lessThanFourOptionsCount: number
  lessThanFourBreakdown: Record<number, number>
  moreThanFourOptionsCount: number
  moreThanFourBreakdown: Record<number, number>
  nonStandardQuestions: Array<{
    questionIndex: number
    optionCount: number
    correctCount: number
    reasons: string[]
  }>
}

export interface ImportPreviewResult {
  normalizedQuiz: NormalizedQuiz
  diagnostics: ImportDiagnostic[]
  summary: ImportSummary
  isValid: boolean
  structureReport?: QuestionStructureReport
}

export interface ImportRawQuestion {
  [key: string]: unknown
  text?: unknown
  options?: unknown
  correct_answer?: unknown
  correct_answers?: unknown
  explanation?: unknown
  image_url?: unknown
}

export interface ImportRawQuizPayload {
  [key: string]: unknown
  quizMeta?: {
    [key: string]: unknown
    course_code?: unknown
    category_id?: unknown
    title?: unknown
    description?: unknown
  }
  questions?: unknown
}
