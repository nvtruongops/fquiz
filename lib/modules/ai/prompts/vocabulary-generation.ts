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
  explanationLanguage?: string
  topic?: string
  word?: string
  cefr?: string
  count?: number
  existingTerms?: string[]
}

export const vocabularyGeneration: PromptDefinition<VocabularyPromptParams, z.ZodArray<typeof GeneratedVocabularySchema>> = {
  name: 'vocabulary-generation',
  version: PROMPT_VERSION,
  schema: z.array(GeneratedVocabularySchema),
  buildPrompt: (params: VocabularyPromptParams): string => {
    const expLang = params.explanationLanguage || 'Vietnamese'
    const exclude = params.existingTerms?.length
      ? `\n\nEXCLUDED TERMS (do NOT generate these): ${params.existingTerms.join(', ')}`
      : ''

    const isSingleLookup = Boolean(params.word && params.word.trim())
    const wordConstraint = isSingleLookup
      ? `specifically analyzing the word/term "${params.word!.trim()}" (if entered in ${expLang}, translate it to the matching base lemma in ${params.language} first) as the first item, and generating a closely related vocabulary item (synonym, antonym, or collocated word) as the second item`
      : `on the topic "${params.topic || 'General Vocabulary'}"`

    const itemCount = isSingleLookup ? 2 : (params.count ?? 2)

    return `You are an expert language teacher. Generate exactly ${itemCount} vocabulary items in "${params.language}" for learners at level ${params.cefr ?? 'B1'}, ${wordConstraint}.

For each vocabulary item, provide:
1. lemma (base form in ${params.language})
2. display (how it appears in lessons)
3. ipa (IPA pronunciation)
4. definition (clear definition written in ${expLang})
5. partOfSpeech
6. examples (2-3 natural sentences showing usage in ${params.language} calibrated to level ${params.cefr ?? 'B1'}, followed by natural translation in ${expLang} in parentheses)
7. cefrLevel (${params.cefr ?? 'B1'})
8. synonyms (optional, 1-3 terms in ${params.language})
9. antonyms (optional, 1-3 terms in ${params.language})
10. collocations (optional, 2-4 common word pairings in ${params.language})
11. wordFamily (optional object with "base": string, "forms": array of { "form": string, "partOfSpeech": string }) — if you cannot provide this, set it to null, never {}

Rules:
- The definition and example translations MUST be in ${expLang}.
- Example sentences MUST be in ${params.language} and calibrated to level ${params.cefr ?? 'B1'}.
- Use natural, contemporary language.${exclude}

Respond ONLY with a valid JSON array of objects matching the provided schema.`
  },
}

