import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

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

export interface WritingEvalPromptParams {
  sourceText: string
  sourceLanguage: string
  userAnswer: string
  userLanguage: string
  sampleAnswer?: string
  cefrLevel: string
}

export const writingEvaluation: PromptDefinition<WritingEvalPromptParams, typeof GeneratedWritingEvalSchema> = {
  name: 'writing-evaluation',
  version: PROMPT_VERSION,
  schema: GeneratedWritingEvalSchema,
  buildPrompt: (params: WritingEvalPromptParams): string => {
    return 'You are a language assessment expert. Evaluate the user writing attempt in ' + params.userLanguage + '. The exercise source text is in ' + params.sourceLanguage + ': "' + params.sourceText + '". User answer in ' + params.userLanguage + ': "' + params.userAnswer + '".' + (params.sampleAnswer ? ' Sample/model answer: "' + params.sampleAnswer + '".' : '') + ' CEFR level target: ' + params.cefrLevel + '. Evaluate thoroughly and return structured JSON. Score the user writing from 0-100. Provide: score (0-100), rating (short label), detailedFeedback (paragraph), strengths (array), improvements (array), corrections (array of { original, corrected, type, explanation }), suggestedAnswer (improved version).'
  },
}
