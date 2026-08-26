import type { SubjectContext } from './subject-resolver'

export interface InternalQuizQuestion {
  id: string
  text: string
  options: string[]
  correctAnswer: number | number[] // ⚠️ Internal only - strictly stripped before reaching client
  explanation?: string
}

export interface InternalQuizContext {
  userId: string
  sessionId: string
  courseCode: string
  categoryId?: string
  subjectContext?: SubjectContext
  currentQuestionIndex: number // UI index (0-based)
  actualQuestionIndex: number  // session.question_order[UI index] (Single source of truth)
  question: InternalQuizQuestion
  userSubmittedAnswer: number | number[] | null
  targetOptionIndex: number | null
  targetOptionLetter: string
  targetOptionText: string
}
