import type { QuizAIIntent } from '../schemas/quiz-assistant.schema'

export interface ModelPricing {
  inputPricePer1M: number
  outputPricePer1M: number
}

export interface SubSourceDurations {
  questionBankMs: number
  quizMs: number
  questionBankStatus: 'fulfilled' | 'rejected' | 'timeout' | 'skipped'
  quizStatus: 'fulfilled' | 'rejected' | 'timeout' | 'skipped'
  partialFailure: boolean
}

export interface LLMTelemetryInfo {
  provider: string
  model: string
  status: 'success' | 'timeout' | 'error' | 'fallback'
  isTimeout: boolean
}

export interface StageDurations {
  contextMs: number
  intentMs: number
  retrievalMs: number
  rankingMs: number
  promptMs: number
  llmMs: number
  validationMs: number
  mappingMs: number
  totalMs: number
  subSources?: SubSourceDurations
}

export interface QuizAITelemetryEvent {
  requestId: string
  timestamp: string
  sessionId: string
  questionId: string
  userIdHash: string // SHA-256 slice for privacy (no raw userId/JWT)
  intent: QuizAIIntent
  responseMode: 'llm' | 'db_fallback' | 'cached'
  fallback: boolean
  confidence: 'high' | 'medium' | 'low'
  evidenceCount: number
  // Token usage (Actual provider tokens prioritized over heuristic)
  tokenUsage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    isActualUsage: boolean
  }
  estimatedCostUsd: number
  durations: StageDurations
  llmInfo: LLMTelemetryInfo
  dbMetrics: {
    operationCount: number
    retryCount: number
  }
  success: boolean
  errorCode?: string
}

export interface QuizAIFeedbackEvent {
  feedbackId: string
  requestId?: string
  sessionId: string
  questionIndex: number
  intent?: QuizAIIntent
  responseMode?: 'llm' | 'db_fallback' | 'cached'
  confidence?: 'high' | 'medium' | 'low'
  helpful: boolean
  timestamp: string
}

export interface HelpfulnessMetricsSummary {
  totalFeedback: number
  helpfulCount: number
  unhelpfulCount: number
  overallHelpfulnessRate: number // e.g. 0.92 = 92%
  byIntent: Record<string, { total: number; helpful: number; rate: number }>
}

export interface TelemetryMetricsSummary {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  fallbackCount: number
  cachedCount: number
  llmCount: number
  emptyRetrievalCount: number
  partialRetrievalFailureCount: number
  averageLatencyMs: number
  p50LatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  averageRetrievalMs: number
  p95RetrievalMs: number
  averageQuestionBankMs: number
  averageQuizMs: number
  totalTokens: number
  totalEstimatedCostUsd: number
  helpfulness?: HelpfulnessMetricsSummary
}
