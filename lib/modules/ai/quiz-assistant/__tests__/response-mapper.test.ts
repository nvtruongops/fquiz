import { ResponseMapper } from '../mapper/response-mapper'
import type { RetrievalResult } from '../retrieval/retrieval-types'

describe('ResponseMapper & Invariant 4 (Anti-Leakage DTO Tests)', () => {
  it('INVARIANT 4: should strictly strip internal correctAnswer and never leak it to client payload', () => {
    const evidences: RetrievalResult[] = [
      {
        id: 'qb-1',
        sourceType: 'question_bank',
        sourceId: '64a7ea5d737d0e002d33c94d',
        content: 'Internal Question with correct answer hidden',
        options: ['A. 10', 'B. 20', 'C. 30'],
        correctAnswer: [2], // ⚠️ Sensitive internal data
        explanation: 'Internal secret explanation',
        score: 0.92,
        metadata: { courseCode: 'PMG201C' },
      },
    ]

    const response = ResponseMapper.toPublicResponse({
      intent: 'EXPLAIN_WRONG_ANSWER',
      llmOutput: {
        reply: 'Phân tích phương án...',
        formulaExplanation: null,
        similarQuestionFound: true,
        similarQuestionDetails: 'Câu hỏi tương tự',
      },
      confidence: 'high',
      evidences,
      responseMode: 'llm',
    })

    // Assert public structure
    expect(response.intent).toBe('EXPLAIN_WRONG_ANSWER')
    expect(response.confidence).toBe('high')
    expect(response.responseMode).toBe('llm')
    expect(response.fallback).toBe(false)
    expect(response.evidenceUsed.length).toBe(1)

    // Verify allowlisting - no sensitive correctAnswer or full explanation leaked
    const firstEvidence = response.evidenceUsed[0] as any
    expect(firstEvidence.sourceId).toBe('64a7ea5d737d0e002d33c94d')
    expect(firstEvidence.correctAnswer).toBeUndefined()
    expect(firstEvidence.options).toBeUndefined()
    expect(firstEvidence.explanation).toBeUndefined()
  })

  it('SECURITY REGRESSION: when LLM output contains tricky text ("The correctAnswer is C"), ResponseMapper still enforces strict public schema allowlist', () => {
    const evidences: RetrievalResult[] = [
      {
        id: 'qb-secret',
        sourceType: 'question_bank',
        sourceId: '64a7ea5d737d0e002d33c999',
        content: 'Confidential Exam Question',
        options: ['A. First', 'B. Second', 'C. Secret Key'],
        correctAnswer: 2,
        explanation: 'Do not leak this internal answer key',
        score: 0.88,
        metadata: { courseCode: 'PMG201C' },
      },
    ]

    const response = ResponseMapper.toPublicResponse({
      intent: 'EXPLAIN_CORRECT_ANSWER',
      llmOutput: {
        reply: 'The correctAnswer is C because it satisfies the project baseline criteria.',
        formulaExplanation: 'Answer key: C',
        similarQuestionFound: true,
        similarQuestionDetails: 'Confidential Exam Question',
      },
      confidence: 'medium',
      evidences,
      responseMode: 'llm',
    })

    const rawResponseObj = JSON.parse(JSON.stringify(response))

    // Ensure raw answer key fields do not exist on the public object
    expect(rawResponseObj.correctAnswer).toBeUndefined()
    expect(rawResponseObj.correct_answer).toBeUndefined()
    expect(rawResponseObj.answerKey).toBeUndefined()
    expect(rawResponseObj.internalContext).toBeUndefined()

    // Ensure evidence items only have safe allowlisted properties
    const evidenceItem = rawResponseObj.evidenceUsed[0]
    expect(evidenceItem.correctAnswer).toBeUndefined()
    expect(evidenceItem.options).toBeUndefined()
    expect(evidenceItem.sourceId).toBe('64a7ea5d737d0e002d33c999')
    expect(evidenceItem.sourceType).toBe('question_bank')
  })

  it('should mark fallback = true when responseMode is db_fallback', () => {
    const response = ResponseMapper.toPublicResponse({
      intent: 'SOLVE_QUESTION',
      llmOutput: {
        reply: 'DB Fallback reply...',
        formulaExplanation: null,
        similarQuestionFound: false,
        similarQuestionDetails: null,
      },
      confidence: 'medium',
      evidences: [],
      responseMode: 'db_fallback',
    })

    expect(response.responseMode).toBe('db_fallback')
    expect(response.fallback).toBe(true)
  })
})
