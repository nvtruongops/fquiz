import type { QuizAssistantResponse, QuizAIIntent, LLMQuizAssistantOutput } from '../schemas/quiz-assistant.schema'
import type { RetrievalResult } from '../retrieval/retrieval-types'

export interface MapToPublicParams {
  intent: QuizAIIntent
  llmOutput: LLMQuizAssistantOutput
  confidence: 'high' | 'medium' | 'low'
  evidences: RetrievalResult[]
  responseMode: 'llm' | 'db_fallback' | 'cached'
}

export class ResponseMapper {
  /**
   * Maps internal data to a clean, allowlisted public client response.
   * Invariant 4: Strips internal sensitive fields (e.g. database keys) while safely exposing matched evidence details.
   */
  static toPublicResponse(params: MapToPublicParams): QuizAssistantResponse {
    const { intent, llmOutput, confidence, evidences, responseMode } = params

    // Strict allowlisting of public evidence fields only
    const publicEvidence = (evidences || []).map((e) => ({
      sourceType: e.sourceType,
      sourceId: e.sourceId,
      snippet: (e.content || '').slice(0, 200),
      relevance: e.score,
      matchedAnswerText: e.matchedAnswerText,
      breakdown: e.breakdown
        ? {
            optionScore: e.breakdown.optionScore,
            questionScore: e.breakdown.questionScore,
            subjectScore: e.breakdown.subjectScore,
          }
        : undefined,
    }))

    return {
      intent,
      reply: llmOutput.reply,
      formulaExplanation: llmOutput.formulaExplanation ?? null,
      similarQuestionFound: Boolean(llmOutput.similarQuestionFound),
      similarQuestionDetails: llmOutput.similarQuestionDetails ?? null,
      confidence,
      responseMode,
      fallback: responseMode === 'db_fallback',
      evidenceUsed: publicEvidence,
    }
  }
}
