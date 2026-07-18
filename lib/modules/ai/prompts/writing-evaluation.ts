import { z } from 'zod'

export interface WritingEvalPromptParams {
  sourceText: string
  sourceLanguage: string
  userAnswer: string
  userLanguage: string
  sampleAnswer?: string
  cefrLevel: string
}

export const GeneratedWritingEvalSchema = z.object({
  score: z.number().min(0).max(100),
  rating: z.string(),
  detailedFeedback: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  corrections: z.array(z.object({
    original: z.string(),
    corrected: z.string(),
    type: z.string(),
    explanation: z.string(),
  })).optional(),
  suggestedAnswer: z.string().optional(),
})

export type GeneratedWritingEval = z.infer<typeof GeneratedWritingEvalSchema>

export function writingEvaluation(params: WritingEvalPromptParams) {
  const { sourceText, sourceLanguage, userAnswer, userLanguage, sampleAnswer, cefrLevel } = params
  const system = 'You are a language assessment expert. Evaluate the user writing attempt in ' + userLanguage + '. The exercise source text is in ' + sourceLanguage + ': "' + sourceText + '". User answer in ' + userLanguage + ': "' + userAnswer + '".' + (sampleAnswer ? ' Sample/model answer: "' + sampleAnswer + '".' : '') + ' CEFR level target: ' + cefrLevel + '. Evaluate thoroughly and return structured JSON.'
  const user = 'Score the user writing from 0-100. Provide: score (0-100), rating (short label), detailedFeedback (paragraph), strengths (array), improvements (array), corrections (array of { original, corrected, type, explanation }), suggestedAnswer (improved version).'
  return { system, user }
}
