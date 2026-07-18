import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

export const GeneratedVocabularySchema = z.object({
  lemma: z.string().min(1),
  display: z.string().min(1),
  ipa: z.string().nullable().optional(),
  definition: z.string().min(1),
  partOfSpeech: z.string().optional().default('noun'),
  examples: z.array(z.string()).min(1),
  cefrLevel: z.string().nullable().optional(),
  synonyms: z.array(z.string()).nullable().optional(),
  antonyms: z.array(z.string()).nullable().optional(),
  collocations: z.array(z.string()).nullable().optional(),
  wordFamily: z.preprocess(
    (val) => {
      if (val && typeof val === 'object' && !Array.isArray(val) && Object.keys(val as Record<string, unknown>).length === 0) {
        return null
      }
      return val
    },
    z.object({
      base: z.string(),
      forms: z.array(z.object({ form: z.string(), partOfSpeech: z.string() })),
    }).nullable().optional(),
  ),
})

export type GeneratedVocabulary = z.infer<typeof GeneratedVocabularySchema>

export interface VocabularyPromptParams {
  language: string
  topic: string
  cefr?: string
  count?: number
  existingTerms?: string[]
}

export const vocabularyGeneration: PromptDefinition<VocabularyPromptParams, z.ZodArray<typeof GeneratedVocabularySchema>> = {
  name: 'vocabulary-generation',
  version: PROMPT_VERSION,
  schema: z.array(GeneratedVocabularySchema),
  buildPrompt: (params: VocabularyPromptParams): string => {
    const exclude = params.existingTerms?.length
      ? `\n\nEXCLUDED TERMS (do NOT generate these): ${params.existingTerms.join(', ')}`
      : ''

    return `You are a professional language teacher. Generate ${params.count ?? 10} vocabulary items for "${params.language}" learners on the topic "${params.topic}" at CEFR level ${params.cefr ?? 'A2'}.

For each word, provide:
1. lemma (base form)
2. display (how it appears in lessons)
3. ipa (IPA pronunciation)
4. definition (clear, age-appropriate)
5. partOfSpeech
6. examples (2-3 natural sentences showing usage)
7. cefrLevel
8. synonyms (optional, 1-3)
9. antonyms (optional, 1-3)
10. collocations (optional, 2-4 common word pairings)
11. wordFamily (optional object with "base": string, "forms": array of { "form": string, "partOfSpeech": string }) — if you cannot provide this, set it to null, never {}

Rules:
- All definitions and examples MUST be in the target language "${params.language}"
- Use natural, contemporary language
- Prioritize high-frequency words for the given CEFR level
- Each vocabulary item must have a unique lemma${exclude}

Respond ONLY with a valid JSON array of objects matching the provided schema.`
  },
}

