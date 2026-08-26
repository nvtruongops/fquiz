import { QuizAITelemetry, MODEL_PRICING } from '../telemetry/quiz-ai-telemetry'

describe('QuizAITelemetry & Audit Architecture Tests (Task 1.2 & 1.4)', () => {
  beforeEach(() => {
    QuizAITelemetry.resetHistory()
  })

  it('should generate unique request tracking ID', () => {
    const id1 = QuizAITelemetry.generateRequestId()
    const id2 = QuizAITelemetry.generateRequestId()
    expect(id1.startsWith('qa_')).toBe(true)
    expect(id2.startsWith('qa_')).toBe(true)
    expect(id1).not.toBe(id2)
  })

  it('should hash user ID to protect privacy in audit logs', () => {
    const hash = QuizAITelemetry.hashUserId('64a7ea5d737d0e002d33c94d')
    expect(hash.length).toBe(12)
    expect(hash).not.toContain('64a7ea5d737d0e002d33c94d')
  })

  it('should estimate token count and calculate estimated cost in USD based on MODEL_PRICING', () => {
    const promptText = 'Explain why option A is incorrect in this project management context.'
    const tokens = QuizAITelemetry.estimateTokens(promptText)
    expect(tokens).toBeGreaterThan(15)

    const cost = QuizAITelemetry.calculateEstimatedCost(1000, 500, 'gemini-2.0-flash')
    // 1000 * 0.075 / 1M = 0.000075 + 500 * 0.30 / 1M = 0.00015 -> 0.000225
    expect(cost).toBeCloseTo(0.000225, 6)

    // Verify MODEL_PRICING dictionary exists and has configurable keys
    expect(MODEL_PRICING['gemini-2.0-flash']).toBeDefined()
    expect(MODEL_PRICING['gpt-4o-mini']).toBeDefined()
  })

  it('should compute rolling telemetry metrics summary, sub-source latencies, and quantiles (p50, p95, p99)', () => {
    // Record 20 events with various latencies
    for (let i = 1; i <= 20; i++) {
      QuizAITelemetry.recordEvent({
        requestId: `qa_${i}`,
        timestamp: new Date().toISOString(),
        sessionId: 'session-1',
        questionId: `q-${i}`,
        userIdHash: 'hash123',
        intent: 'EXPLAIN_WRONG_ANSWER',
        responseMode: i % 5 === 0 ? 'db_fallback' : 'llm',
        fallback: i % 5 === 0,
        confidence: i > 10 ? 'high' : 'medium',
        evidenceCount: i % 3 === 0 ? 0 : 2,
        tokenUsage: {
          promptTokens: 200,
          completionTokens: 100,
          totalTokens: 300,
          isActualUsage: i % 2 === 0,
        },
        estimatedCostUsd: 0.000045,
        durations: {
          contextMs: 10,
          intentMs: 2,
          retrievalMs: 50 + i * 5, // 55ms to 150ms
          rankingMs: 1,
          promptMs: 2,
          llmMs: 1000 + i * 50, // 1050ms to 2000ms
          validationMs: 5,
          mappingMs: 2,
          totalMs: 1100 + i * 60, // 1160ms to 2300ms
          subSources: {
            questionBankMs: 30 + i * 2,
            quizMs: 20 + i * 3,
            questionBankStatus: 'fulfilled',
            quizStatus: 'fulfilled',
            partialFailure: false,
          },
        },
        llmInfo: {
          provider: 'gemini',
          model: 'gemini-2.0-flash',
          status: 'success',
          isTimeout: false,
        },
        dbMetrics: {
          operationCount: 2,
          retryCount: 0,
        },
        success: true,
      })
    }

    const summary = QuizAITelemetry.getMetricsSummary()

    expect(summary.totalRequests).toBe(20)
    expect(summary.successfulRequests).toBe(20)
    expect(summary.failedRequests).toBe(0)
    expect(summary.fallbackCount).toBe(4)
    expect(summary.llmCount).toBe(16)
    expect(summary.p50LatencyMs).toBeGreaterThan(1500)
    expect(summary.p95LatencyMs).toBeGreaterThan(2000)
    expect(summary.p95RetrievalMs).toBeLessThanOrEqual(300)
    expect(summary.averageQuestionBankMs).toBeGreaterThan(0)
    expect(summary.averageQuizMs).toBeGreaterThan(0)
    expect(summary.totalTokens).toBe(20 * 300)
    expect(summary.totalEstimatedCostUsd).toBeGreaterThan(0)
  })

  it('INVARIANT: Helpfulness Rate Calculation per Intent for P4 Telemetry Observation', () => {
    // 9 helpful, 1 unhelpful for EXPLAIN_WRONG_ANSWER
    for (let i = 0; i < 9; i++) {
      QuizAITelemetry.recordFeedback({
        feedbackId: `fb_w_${i}`,
        sessionId: 'session-1',
        questionIndex: 0,
        intent: 'EXPLAIN_WRONG_ANSWER',
        responseMode: 'llm',
        confidence: 'high',
        helpful: true,
        timestamp: new Date().toISOString(),
      })
    }
    QuizAITelemetry.recordFeedback({
      feedbackId: 'fb_w_unhelpful',
      sessionId: 'session-1',
      questionIndex: 0,
      intent: 'EXPLAIN_WRONG_ANSWER',
      responseMode: 'llm',
      confidence: 'medium',
      helpful: false,
      timestamp: new Date().toISOString(),
    })

    // 5 helpful for EXPLAIN_CORRECT_ANSWER
    for (let i = 0; i < 5; i++) {
      QuizAITelemetry.recordFeedback({
        feedbackId: `fb_c_${i}`,
        sessionId: 'session-1',
        questionIndex: 1,
        intent: 'EXPLAIN_CORRECT_ANSWER',
        responseMode: 'llm',
        confidence: 'high',
        helpful: true,
        timestamp: new Date().toISOString(),
      })
    }

    const helpfulness = QuizAITelemetry.getHelpfulnessSummary()
    expect(helpfulness.totalFeedback).toBe(15)
    expect(helpfulness.helpfulCount).toBe(14)
    expect(helpfulness.unhelpfulCount).toBe(1)
    expect(helpfulness.overallHelpfulnessRate).toBeCloseTo(14 / 15, 3)

    expect(helpfulness.byIntent['EXPLAIN_WRONG_ANSWER'].total).toBe(10)
    expect(helpfulness.byIntent['EXPLAIN_WRONG_ANSWER'].helpful).toBe(9)
    expect(helpfulness.byIntent['EXPLAIN_WRONG_ANSWER'].rate).toBe(0.9)

    expect(helpfulness.byIntent['EXPLAIN_CORRECT_ANSWER'].total).toBe(5)
    expect(helpfulness.byIntent['EXPLAIN_CORRECT_ANSWER'].helpful).toBe(5)
    expect(helpfulness.byIntent['EXPLAIN_CORRECT_ANSWER'].rate).toBe(1.0)
  })
})
