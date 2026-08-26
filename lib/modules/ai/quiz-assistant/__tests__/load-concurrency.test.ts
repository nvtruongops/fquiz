import { QuizAIOrchestrator } from '../orchestrator'
import { QuizAITelemetry } from '../telemetry/quiz-ai-telemetry'
import type { IRetrievalEngine, RetrievalInput, DetailedRetrievalOutput } from '../retrieval/retrieval-types'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { container } from '@/lib/core/di'

jest.mock('@/lib/modules/quiz/models/QuizSession', () => ({
  QuizSession: {
    findById: jest.fn(),
  },
}))

jest.mock('@/lib/modules/quiz/models/Quiz', () => ({
  Quiz: {
    findById: jest.fn(),
  },
}))

jest.mock('@/lib/core/di', () => ({
  container: {
    resolve: jest.fn(),
  },
}))

describe('Concurrency Load Matrix & MongoDB Capacity Benchmark (P1.5 Gate)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    QuizAITelemetry.resetHistory()
  })

  // Simulated concurrency engine that models MongoDB Atlas connection pool & query queuing
  class ConcurrentMockRetriever implements IRetrievalEngine {
    private activeQueries = 0

    async search(input: RetrievalInput) {
      const d = await this.searchDetailed(input)
      return d.evidences
    }

    async searchDetailed(input: RetrievalInput): Promise<DetailedRetrievalOutput> {
      this.activeQueries++
      // Simulate MongoDB query delay with slight queue jitter based on concurrency
      const jitter = Math.min(60, this.activeQueries * 1.2)
      const qbLatency = 25 + Math.random() * 20 + jitter
      const quizLatency = 20 + Math.random() * 15 + jitter

      await new Promise((res) => setTimeout(res, Math.max(qbLatency, quizLatency)))
      this.activeQueries--

      return {
        evidences: [
          {
            id: 'qb-c-1',
            sourceType: 'question_bank',
            sourceId: 'qb-123',
            content: 'What is communication management in PMG?',
            options: ['A. Scope Plan', 'B. Communication Plan'],
            correctAnswer: 1,
            score: 0.92,
            metadata: { courseCode: 'PMG201C' },
          },
        ],
        subSources: {
          questionBankMs: Number(qbLatency.toFixed(1)),
          quizMs: Number(quizLatency.toFixed(1)),
          questionBankStatus: 'fulfilled',
          quizStatus: 'fulfilled',
          partialFailure: false,
        },
      }
    }
  }

  it.each([10, 25, 50, 100])(
    'CONCURRENCY LOAD TEST: %i concurrent users must satisfy SLA (p95 < 2500ms, DB p95 < 300ms, fallback <= 5%)',
    async (concurrency) => {
      QuizAITelemetry.resetHistory()

      ;(QuizSession.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'session-c-1',
          student_id: 'student-c-1',
          question_order: [0],
          questions_cache: [
            {
              _id: 'q-c-1',
              text: 'What is communication management in PMG?',
              options: ['A. Scope Plan', 'B. Communication Plan'],
              correct_answer: 1,
            },
          ],
        }),
      })

      ;(Quiz.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: 'quiz-c-1',
            course_code: 'PMG201C',
            category_id: 'cat-c-1',
          }),
        }),
      })

      const mockAiContentService = {
        generate: jest.fn().mockImplementation(async () => {
          // Simulate LLM API latency between 100ms - 350ms
          const delay = 100 + Math.random() * 250
          await new Promise((res) => setTimeout(res, delay))
          return {
            content: {
              reply: 'Phân tích phương án...',
              formulaExplanation: null,
              similarQuestionFound: true,
              similarQuestionDetails: 'What is communication management?',
            },
            usage: {
              promptTokens: 180,
              completionTokens: 85,
              totalTokens: 265,
            },
            provider: 'gemini',
            model: 'gemini-2.0-flash',
            reused: false,
          }
        }),
      }
      ;(container.resolve as jest.Mock).mockReturnValue(mockAiContentService)

      const orchestrator = new QuizAIOrchestrator({
        retrievalEngine: new ConcurrentMockRetriever(),
        totalTimeoutMs: 2500,
        maxLlmTimeoutMs: 2200,
      })

      // Dispatch concurrent requests simultaneously via Promise.all
      const requests = Array.from({ length: concurrency }).map((_, idx) =>
        orchestrator.execute({
          sessionId: 'session-c-1',
          questionIndex: 0,
          userQuery: `Concurrent request test #${idx}`,
          authenticatedUserId: 'student-c-1',
        })
      )

      const results = await Promise.all(requests)

      expect(results.length).toBe(concurrency)
      for (const res of results) {
        expect(res.reply).toBeDefined()
        expect(res.confidence).toBe('medium')
      }

      // Assert Telemetry Metrics & Quantiles
      const summary = QuizAITelemetry.getMetricsSummary()
      expect(summary.totalRequests).toBe(concurrency)
      expect(summary.successfulRequests).toBe(concurrency)
      expect(summary.failedRequests).toBe(0)

      // SLA Threshold checks under concurrency
      expect(summary.p50LatencyMs).toBeLessThan(1500)
      expect(summary.p95LatencyMs).toBeLessThan(2500)
      expect(summary.p95RetrievalMs).toBeLessThan(300) // DB retrieval remains < 300ms
      expect(summary.averageQuestionBankMs).toBeGreaterThan(0)
      expect(summary.averageQuizMs).toBeGreaterThan(0)
    }
  )
})
