import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

export const GeneratedGrammarSchema = z.object({
  patternName: z.string().min(2),
  pattern: z.string().min(2),
  explanation: z.string().min(20),
  rules: z.array(z.string()).min(2),
  examples: z.array(z.object({
    sentence: z.string(),
    translation: z.string(),
    breakdown: z.string().optional(),
  })).min(2).max(6),
  commonMistakes: z.array(z.object({
    mistake: z.string(),
    correction: z.string(),
    explanation: z.string(),
  })).optional(),
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  relatedPatterns: z.array(z.string()).optional(),
})

export type GeneratedGrammar = z.infer<typeof GeneratedGrammarSchema>

export interface GrammarPromptParams {
  language: string
  topic?: string
  cefr?: string
  patternName?: string
}

export const grammarGeneration: PromptDefinition<GrammarPromptParams, typeof GeneratedGrammarSchema> = {
  name: 'grammar-generation',
  version: PROMPT_VERSION,
  schema: GeneratedGrammarSchema,
  buildPrompt: (params: GrammarPromptParams): string => {
    const patternConstraint = params.patternName
      ? ` specifically for the grammar pattern "${params.patternName}"`
      : ''
    const topicContext = params.topic
      ? ` Contextualized within the topic "${params.topic}".`
      : ''

  return `You are a grammar specialist teaching "${params.language}" grammar${patternConstraint} at CEFR level ${params.cefr ?? 'B1'}.${topicContext}

Provide a comprehensive grammar explanation with:

1. patternName (descriptive name of the grammar point)
2. pattern (the grammatical formula, e.g., "Subject + have/has + past participle")
3. explanation (clear, learner-friendly explanation in English)
4. rules (list of 2-4 concrete rules for using this pattern)
5. examples (3-4 example sentences in ${params.language} with:
   - sentence: the example in ${params.language}
   - translation: English translation
   - breakdown: optional word-by-word explanation)
6. commonMistakes (optional: 2-3 frequent errors learners make)
7. cefrLevel
8. relatedPatterns (optional: related grammar points)

Rules:
- Example sentences MUST be in ${params.language} with English translations
- Explanations are in English for clarity
- Focus on practical usage, not theoretical linguistics
- Include contrast with similar patterns if relevant

Respond ONLY with a valid JSON object matching the provided schema.`
  },
}

