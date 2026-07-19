import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

export const GeneratedGrammarSchema = z.object({
  patternName: z.string().min(1),
  pattern: z.string().min(1),
  explanation: z.string().min(1),
  rules: z.array(z.string()).min(1),
  examples: z.array(z.object({
    sentence: z.string(),
    translation: z.string(),
    breakdown: z.string().nullable().optional(),
  })).min(1),
  commonMistakes: z.preprocess(
    (val) => {
      if (Array.isArray(val)) {
        return val.map((item) => {
          if (typeof item === 'string') {
            return { mistake: item, correction: '', explanation: '' }
          }
          return item
        })
      }
      return val
    },
    z.array(z.object({
      mistake: z.string(),
      correction: z.string(),
      explanation: z.string(),
    })).nullable().optional(),
  ),
  cefrLevel: z.string().nullable().optional(),
  relatedPatterns: z.array(z.string()).nullable().optional(),
})

export type GeneratedGrammar = z.infer<typeof GeneratedGrammarSchema>

export interface GrammarPromptParams {
  language: string
  explanationLanguage?: string
  topic?: string
  cefr?: string
  patternName?: string
}

export const grammarGeneration: PromptDefinition<GrammarPromptParams, typeof GeneratedGrammarSchema> = {
  name: 'grammar-generation',
  version: PROMPT_VERSION,
  schema: GeneratedGrammarSchema,
  buildPrompt: (params: GrammarPromptParams): string => {
    const expLang = params.explanationLanguage || 'Vietnamese'
    const patternConstraint = params.patternName
      ? ` specifically for the grammar pattern "${params.patternName}"`
      : params.topic
      ? ` specifically for the grammar topic "${params.topic}"`
      : ''

    return `You are a grammar specialist teaching "${params.language}" grammar${patternConstraint} at level ${params.cefr ?? 'B1'}.

Provide a comprehensive grammar explanation with:

1. patternName (descriptive name of the grammar point)
2. pattern (the grammatical formula, e.g., "Subject + have/has + past participle")
3. explanation (clear, learner-friendly explanation written in ${expLang})
4. rules (list of 2-4 concrete rules written in ${expLang})
5. examples (3-4 example sentences in ${params.language} with:
   - sentence: the example in ${params.language}
   - translation: translation in ${expLang}
   - breakdown: optional word-by-word explanation in ${expLang})
6. commonMistakes (optional array of objects: each with "mistake", "correction", "explanation" written in ${expLang})
7. cefrLevel (${params.cefr ?? 'B1'})
8. relatedPatterns (optional: related grammar points)

Rules:
- Example sentences MUST be in ${params.language} with translations in ${expLang}.
- Explanations and rules MUST be in ${expLang} for maximum clarity.
- Focus on practical usage, not theoretical linguistics.

Respond ONLY with a valid JSON object matching the provided schema.`
  },
}

