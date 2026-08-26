import type { QuizAIIntent } from '../schemas/quiz-assistant.schema'
import type { SubSourceDurations } from '../telemetry/telemetry-types'

export interface RetrievalInput {
  courseCode: string
  categoryId?: string
  currentQuestionId?: string
  currentQuestionText: string
  targetOptionLetter?: string
  targetOptionText?: string
  userQuery: string
  intent: QuizAIIntent
  limit?: number
}

export interface RelevanceScoreBreakdown {
  totalScore: number
  optionScore: number
  questionScore: number
  subjectScore: number
}

export interface RetrievalResult {
  id: string
  sourceType: 'question_bank' | 'quiz' | 'course_document'
  sourceId: string
  content: string
  options?: string[]
  correctAnswer?: number | number[]
  explanation?: string
  score: number // Điểm liên quan chuẩn hóa [0.0 - 1.0]
  matchedAnswerText?: string // Văn bản đáp án đúng của câu đối chiếu
  breakdown?: {
    optionScore: number
    questionScore: number
    subjectScore: number
  }
  metadata: {
    courseCode?: string
    categoryId?: string
    quizId?: string
  }
}

export interface DetailedRetrievalOutput {
  evidences: RetrievalResult[]
  subSources: SubSourceDurations
}

export interface IRetrievalEngine {
  search(input: RetrievalInput): Promise<RetrievalResult[]>
  searchDetailed?(input: RetrievalInput): Promise<DetailedRetrievalOutput>
}
