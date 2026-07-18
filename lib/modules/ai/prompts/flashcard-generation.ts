import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

export const GeneratedFlashcardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  hint: z.string().nullable().optional(),
  example: z.string().nullable().optional(),
  mnemonic: z.string().nullable().optional(),
  cefrLevel: z.string().nullable().optional(),
})

export type GeneratedFlashcard = z.infer<typeof GeneratedFlashcardSchema>

export interface FlashcardPromptParams {
  language: string
  topic: string
  cefr?: string
  count?: number
  existingTerms?: string[]
  flashcardType?: 'vocabulary' | 'phrase' | 'grammar' | 'culture'
}

export const flashcardGeneration: PromptDefinition<FlashcardPromptParams, z.ZodArray<typeof GeneratedFlashcardSchema>> = {
  name: 'flashcard-generation',
  version: PROMPT_VERSION,
  schema: z.array(GeneratedFlashcardSchema),
  buildPrompt: (params: FlashcardPromptParams): string => {
    const typeInstruction = params.flashcardType === 'vocabulary'
      ? 'front: target word/phrase in target language, back: definition + example sentence'
      : params.flashcardType === 'phrase'
      ? 'front: common phrase in target language, back: meaning + usage context'
      : params.flashcardType === 'grammar'
      ? 'front: grammar pattern name, back: rule explanation + example'
      : params.flashcardType === 'culture'
      ? 'front: cultural concept name, back: explanation in English'
      : 'front: prompt in target language, back: answer/explanation'

    const exclude = params.existingTerms?.length
      ? `\n\nEXCLUDED TERMS (do NOT generate these): ${params.existingTerms.join(', ')}`
      : ''

    return `You are creating ${params.flashcardType ?? 'vocabulary'} flashcards for "${params.language}" learners at ${params.cefr ?? 'A2'} level on the topic "${params.topic}".

Generate ${params.count ?? 10} flashcards.

For each flashcard:
- front: ${typeInstruction}
- back: complete, accurate answer
- hint: optional clue to help recall
- example: optional example sentence using the concept
- mnemonic: optional memory aid
- cefrLevel: appropriate CEFR level${exclude}

Rules:
- Front text should be primarily in ${params.language}
- Back text can mix ${params.language} and English for clarity
- Flashcards must be self-contained (no external references needed)
- Prefer high-frequency, practical content
- Make mnemonics memorable but not silly

Respond ONLY with a valid JSON array of objects matching the provided schema.`
  },
}

