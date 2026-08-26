import { POST } from '../quiz-assistant/feedback/route'
import { QuizAITelemetry } from '@/lib/modules/ai/quiz-assistant/telemetry/quiz-ai-telemetry'

jest.mock('@/lib/modules/auth/with-auth', () => ({
  withAuth: (handler: any) => (req: Request) =>
    handler(req, { payload: { userId: 'user-123', role: 'student' } }),
}))

describe('POST /api/v1/ai/quiz-assistant/feedback - Micro-Feedback Route', () => {
  beforeEach(() => {
    QuizAITelemetry.resetHistory()
  })

  it('should record user helpful feedback successfully', async () => {
    const req = new Request('http://localhost/api/v1/ai/quiz-assistant/feedback', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'session-123',
        questionIndex: 0,
        requestId: 'qa_abc123',
        intent: 'EXPLAIN_WRONG_ANSWER',
        responseMode: 'llm',
        confidence: 'high',
        helpful: true,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const summary = QuizAITelemetry.getHelpfulnessSummary()
    expect(summary.totalFeedback).toBe(1)
    expect(summary.helpfulCount).toBe(1)
    expect(summary.overallHelpfulnessRate).toBe(1.0)
    expect(summary.byIntent['EXPLAIN_WRONG_ANSWER'].rate).toBe(1.0)
  })

  it('should return 400 when required fields are missing', async () => {
    const req = new Request('http://localhost/api/v1/ai/quiz-assistant/feedback', {
      method: 'POST',
      body: JSON.stringify({
        // missing sessionId, questionIndex, helpful
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
