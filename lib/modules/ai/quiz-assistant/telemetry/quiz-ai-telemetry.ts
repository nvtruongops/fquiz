import { createHash, randomUUID } from 'crypto'
import type {
  QuizAITelemetryEvent,
  QuizAIFeedbackEvent,
  HelpfulnessMetricsSummary,
  TelemetryMetricsSummary,
  ModelPricing,
} from './telemetry-types'

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gemini-2.0-flash': {
    inputPricePer1M: 0.075,
    outputPricePer1M: 0.30,
  },
  'gemini-1.5-flash': {
    inputPricePer1M: 0.075,
    outputPricePer1M: 0.30,
  },
  'gemini-1.5-pro': {
    inputPricePer1M: 1.25,
    outputPricePer1M: 5.00,
  },
  'gpt-4o-mini': {
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.60,
  },
  default: {
    inputPricePer1M: 0.075,
    outputPricePer1M: 0.30,
  },
}

export class QuizAITelemetry {
  private static eventsHistory: QuizAITelemetryEvent[] = []
  private static feedbackHistory: QuizAIFeedbackEvent[] = []
  private static readonly MAX_HISTORY = 1000

  /**
   * Generate a unique request tracking ID
   */
  static generateRequestId(): string {
    return `qa_${randomUUID().replace(/-/g, '').slice(0, 16)}`
  }

  /**
   * Hash user ID to preserve privacy in audit logs
   */
  static hashUserId(userId: string): string {
    if (!userId) return 'anonymous'
    return createHash('sha256').update(userId).digest('hex').slice(0, 12)
  }

  /**
   * Estimate token count from text heuristic (~3 chars per token for Vietnamese/mixed)
   */
  static estimateTokens(text: string): number {
    if (!text) return 0
    return Math.ceil(text.length / 3.0)
  }

  /**
   * Calculate estimated USD cost based on token usage and model pricing config
   */
  static calculateEstimatedCost(
    promptTokens: number,
    completionTokens: number,
    modelKey: string = 'gemini-2.0-flash'
  ): number {
    const pricing = MODEL_PRICING[modelKey] || MODEL_PRICING.default
    const inputCost = (promptTokens / 1_000_000) * pricing.inputPricePer1M
    const outputCost = (completionTokens / 1_000_000) * pricing.outputPricePer1M
    return Number((inputCost + outputCost).toFixed(7))
  }

  /**
   * Record a completed telemetry event safely without logging sensitive payloads
   */
  static recordEvent(event: QuizAITelemetryEvent): void {
    if (this.eventsHistory.length >= this.MAX_HISTORY) {
      this.eventsHistory.shift()
    }
    this.eventsHistory.push(event)

    // Structured Audit Log (Safe fields only - no raw userQuery, no correctAnswer, no JWT)
    if (process.env.NODE_ENV !== 'test') {
      console.log(
        JSON.stringify({
          type: 'AI_AUDIT_LOG',
          event: 'quiz_assistant_request',
          requestId: event.requestId,
          timestamp: event.timestamp,
          sessionId: event.sessionId,
          questionId: event.questionId,
          userIdHash: event.userIdHash,
          intent: event.intent,
          responseMode: event.responseMode,
          fallback: event.fallback,
          confidence: event.confidence,
          evidenceCount: event.evidenceCount,
          totalLatencyMs: event.durations.totalMs,
          retrievalLatencyMs: event.durations.retrievalMs,
          questionBankMs: event.durations.subSources?.questionBankMs,
          quizMs: event.durations.subSources?.quizMs,
          llmLatencyMs: event.durations.llmMs,
          llmProvider: event.llmInfo.provider,
          llmModel: event.llmInfo.model,
          tokenUsage: event.tokenUsage,
          estimatedCostUsd: event.estimatedCostUsd,
          success: event.success,
        })
      )
    }
  }

  /**
   * Record user helpfulness feedback (👍 / 👎)
   */
  static recordFeedback(event: QuizAIFeedbackEvent): void {
    if (this.feedbackHistory.length >= this.MAX_HISTORY) {
      this.feedbackHistory.shift()
    }
    this.feedbackHistory.push(event)

    if (process.env.NODE_ENV !== 'test') {
      console.log(
        JSON.stringify({
          type: 'AI_FEEDBACK_LOG',
          event: 'quiz_assistant_feedback',
          feedbackId: event.feedbackId,
          requestId: event.requestId,
          sessionId: event.sessionId,
          questionIndex: event.questionIndex,
          intent: event.intent,
          responseMode: event.responseMode,
          confidence: event.confidence,
          helpful: event.helpful,
          timestamp: event.timestamp,
        })
      )
    }
  }

  /**
   * Calculate helpfulness rate overall and per intent
   */
  static getHelpfulnessSummary(): HelpfulnessMetricsSummary {
    const feedbackList = this.feedbackHistory
    if (feedbackList.length === 0) {
      return {
        totalFeedback: 0,
        helpfulCount: 0,
        unhelpfulCount: 0,
        overallHelpfulnessRate: 0,
        byIntent: {},
      }
    }

    let helpfulCount = 0
    const byIntent: Record<string, { total: number; helpful: number; rate: number }> = {}

    for (const fb of feedbackList) {
      if (fb.helpful) helpfulCount++

      const intentKey = fb.intent || 'UNKNOWN'
      if (!byIntent[intentKey]) {
        byIntent[intentKey] = { total: 0, helpful: 0, rate: 0 }
      }
      byIntent[intentKey].total++
      if (fb.helpful) byIntent[intentKey].helpful++
    }

    for (const k of Object.keys(byIntent)) {
      const item = byIntent[k]
      item.rate = Number((item.helpful / item.total).toFixed(4))
    }

    return {
      totalFeedback: feedbackList.length,
      helpfulCount,
      unhelpfulCount: feedbackList.length - helpfulCount,
      overallHelpfulnessRate: Number((helpfulCount / feedbackList.length).toFixed(4)),
      byIntent,
    }
  }

  /**
   * Compute comprehensive rolling statistics & quantiles (p50, p95, p99)
   */
  static getMetricsSummary(): TelemetryMetricsSummary {
    const events = this.eventsHistory
    if (events.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        fallbackCount: 0,
        cachedCount: 0,
        llmCount: 0,
        emptyRetrievalCount: 0,
        partialRetrievalFailureCount: 0,
        averageLatencyMs: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        averageRetrievalMs: 0,
        p95RetrievalMs: 0,
        averageQuestionBankMs: 0,
        averageQuizMs: 0,
        totalTokens: 0,
        totalEstimatedCostUsd: 0,
        helpfulness: this.getHelpfulnessSummary(),
      }
    }

    const totalRequests = events.length
    let successfulRequests = 0
    let failedRequests = 0
    let fallbackCount = 0
    let cachedCount = 0
    let llmCount = 0
    let emptyRetrievalCount = 0
    let partialRetrievalFailureCount = 0

    let totalLatency = 0
    let totalRetrievalLatency = 0
    let totalQBLatency = 0
    let totalQuizLatency = 0
    let totalTokens = 0
    let totalCost = 0

    const latencies: number[] = []
    const retrievalLatencies: number[] = []

    for (const ev of events) {
      if (ev.success) successfulRequests++
      else failedRequests++

      if (ev.responseMode === 'db_fallback') fallbackCount++
      else if (ev.responseMode === 'cached') cachedCount++
      else if (ev.responseMode === 'llm') llmCount++

      if (ev.evidenceCount === 0) emptyRetrievalCount++
      if (ev.durations.subSources?.partialFailure) partialRetrievalFailureCount++

      totalLatency += ev.durations.totalMs
      latencies.push(ev.durations.totalMs)

      totalRetrievalLatency += ev.durations.retrievalMs
      retrievalLatencies.push(ev.durations.retrievalMs)

      if (ev.durations.subSources) {
        totalQBLatency += ev.durations.subSources.questionBankMs || 0
        totalQuizLatency += ev.durations.subSources.quizMs || 0
      }

      totalTokens += ev.tokenUsage.totalTokens
      totalCost += ev.estimatedCostUsd
    }

    latencies.sort((a, b) => a - b)
    retrievalLatencies.sort((a, b) => a - b)

    const quantile = (arr: number[], q: number) => {
      if (arr.length === 0) return 0
      const idx = Math.min(arr.length - 1, Math.floor(arr.length * q))
      return arr[idx]
    }

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      fallbackCount,
      cachedCount,
      llmCount,
      emptyRetrievalCount,
      partialRetrievalFailureCount,
      averageLatencyMs: Number((totalLatency / totalRequests).toFixed(1)),
      p50LatencyMs: quantile(latencies, 0.50),
      p95LatencyMs: quantile(latencies, 0.95),
      p99LatencyMs: quantile(latencies, 0.99),
      averageRetrievalMs: Number((totalRetrievalLatency / totalRequests).toFixed(1)),
      p95RetrievalMs: quantile(retrievalLatencies, 0.95),
      averageQuestionBankMs: Number((totalQBLatency / totalRequests).toFixed(1)),
      averageQuizMs: Number((totalQuizLatency / totalRequests).toFixed(1)),
      totalTokens,
      totalEstimatedCostUsd: Number(totalCost.toFixed(6)),
      helpfulness: this.getHelpfulnessSummary(),
    }
  }

  /**
   * Clear in-memory history (for test isolation)
   */
  static resetHistory(): void {
    this.eventsHistory = []
    this.feedbackHistory = []
  }
}
