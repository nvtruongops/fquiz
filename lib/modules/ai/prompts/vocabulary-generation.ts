import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

export const GeneratedVocabularySchema = z.object({
  lemma: z.string().min(1),
  display: z.string().min(1),
  ipa: z.string().optional(),
  definition: z.string().min(10),
  partOfSpeech: z.enum(['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection']),
  examples: z.array(z.string()).min(1).max(5),
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  synonyms: z.array(z.string()).optional(),
  antonyms: z.array(z.string()).optional(),
  collocations: z.array(z.string()).optional(),
  wordFamily: z.object({
    base: z.string(),
    forms: z.array(z.object({ form: z.string(), partOfSpeech: z.string() })),
  }).optional(),
})

export type GeneratedVocabulary = z.infer<typeof GeneratedVocabularySchema>

export interface VocabularyPromptParams {
  language: string
  topic: string
  cefr?: string
  count?: number
  existingTerms?: string[]
}

export const vocabularyGeneration: PromptDefinition<VocabularyPromptParams, typeof GeneratedVocabularySchema> = {
  name: 'vocabulary-generation',
  version: PROMPT_VERSION,
  schema: GeneratedVocabularySchema,
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
11. wordFamily (optional: base + related forms)

Rules:
- All definitions and examples MUST be in the target language "${params.language}"
- Use natural, contemporary language
- Prioritize high-frequency words for the given CEFR level
- Each vocabulary item must have a unique lemma${exclude}

Respond ONLY with a valid JSON array of objects matching the provided schema.`
  },
}

