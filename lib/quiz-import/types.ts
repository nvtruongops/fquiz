export type ImportRole = 'admin' | 'student'

export type DiagnosticLevel = 'error' | 'warning'

export interface ImportDiagnostic {
  level: DiagnosticLevel
  code: string
  message: string
  questionIndex?: number
  field?: string
}

export interface ImportSummary {
  totalQuestions: number
  validQuestions: number
  invalidQuestions: number
  errors: number
  warnings: number
}

export interface NormalizedQuestion {
  text: string
  options: string[]
  correct_answer: number[]
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

export interface ImportPreviewResult {
  normalizedQuiz: NormalizedQuiz
  diagnostics: ImportDiagnostic[]
  summary: ImportSummary
  isValid: boolean
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
