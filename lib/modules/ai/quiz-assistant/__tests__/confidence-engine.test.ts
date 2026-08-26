import { ConfidenceEngine } from '../confidence/confidence-engine'
import type { RetrievalResult } from '../retrieval/retrieval-types'

describe('ConfidenceEngine Tests', () => {
  it('should return high when topScore >= 0.85 and at least 2 matching candidates exist', () => {
    const evidences: RetrievalResult[] = [
      { id: '1', sourceType: 'question_bank', sourceId: '1', content: 'Q1', score: 0.90, metadata: {} },
      { id: '2', sourceType: 'question_bank', sourceId: '2', content: 'Q2', score: 0.86, metadata: {} },
    ]
    expect(ConfidenceEngine.evaluate(evidences, 'FIND_SIMILAR_QUESTION')).toBe('high')
  })

  it('should return medium when only 1 candidate exists with score >= 0.70', () => {
    const evidences: RetrievalResult[] = [
      { id: '1', sourceType: 'question_bank', sourceId: '1', content: 'Q1', score: 0.75, metadata: {} },
    ]
    expect(ConfidenceEngine.evaluate(evidences, 'EXPLAIN_WRONG_ANSWER')).toBe('medium')
  })

  it('should return low when no evidence exists for FIND_SIMILAR_QUESTION', () => {
    expect(ConfidenceEngine.evaluate([], 'FIND_SIMILAR_QUESTION')).toBe('low')
  })

  it('should return medium when no evidence exists but intent is SOLVE_QUESTION or EXPLAIN_CORRECT_ANSWER', () => {
    expect(ConfidenceEngine.evaluate([], 'SOLVE_QUESTION')).toBe('medium')
    expect(ConfidenceEngine.evaluate([], 'EXPLAIN_CORRECT_ANSWER')).toBe('medium')
  })
})
