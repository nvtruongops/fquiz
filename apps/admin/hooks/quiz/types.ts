export interface Category {
  _id: string
  name: string
}

export interface QuestionItem {
  question_id?: string
  text: string
  options: string[]
  correct_answer: number[]
  explanation?: string
  image_url?: string
}

export interface BankCheckDetail {
  questionIndex: number
  question_id: string
  status: 'new' | 'reused' | 'conflict'
  message: string
  uploaded: {
    text: string
    options: string[]
    correct_answer: number[]
    answer_texts: string[]
    explanation?: string
  }
  bank?: {
    question_id: string
    options: string[]
    correct_answer: number[]
    answer_texts: string[]
    explanation?: string
    quizzes: Array<{ quiz_id?: string; course_code: string }>
  }
}

export interface BankCheckResult {
  total_questions: number
  new_questions_count: number
  reused_questions_count: number
  conflict_questions_count: number
  details: BankCheckDetail[]
}

export interface ParsedFilePreview {
  fileName: string
  fileSize: string
  parsedDescription?: string
  parsedCourseCode?: string
  rawQuestions: QuestionItem[]
  checkResult: BankCheckResult | null
  conflictResolutions: Record<number, 'file' | 'bank'>
}

export interface QuizDiagnosticError {
  message: string
  questionIndex?: number
}

export interface QuizDiagnostics {
  total: number
  completed: number
  percent: number
  errors: QuizDiagnosticError[]
  isValid: boolean
}
