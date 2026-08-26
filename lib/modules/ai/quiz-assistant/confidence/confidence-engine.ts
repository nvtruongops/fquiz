import type { RetrievalResult } from '../retrieval/retrieval-types'
import type { QuizAIIntent } from '../schemas/quiz-assistant.schema'

export class ConfidenceEngine {
  /**
   * Deterministically evaluate confidence based on retrieved evidence and user intent
   */
  static evaluate(evidences: RetrievalResult[], intent: QuizAIIntent): 'high' | 'medium' | 'low' {
    if (!evidences || evidences.length === 0) {
      // General theories or solving guidance can have medium confidence even without specific matching evidence
      if (intent === 'SOLVE_QUESTION' || intent === 'EXPLAIN_CORRECT_ANSWER') {
        return 'medium'
      }
      return 'low'
    }

    const topScore = evidences[0]?.score ?? 0

    // High confidence: At least 2 strong matching candidates
    if (topScore >= 0.85 && evidences.length >= 2) {
      return 'high'
    }

    // Medium confidence: At least 1 candidate with reasonable score
    if (topScore >= 0.70 || evidences.length >= 1) {
      return 'medium'
    }

    return 'low'
  }
}
