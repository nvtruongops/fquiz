import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

export const GeneratedWritingPromptSchema = z.object({
  title: z.string(),
  sourceText: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  cefrLevel: z.string(),
  wordCount: z.number(),
  hints: z.array(z.object({
    wordOrPhrase: z.string(),
    meaning: z.string(),
  })).optional(),
  notes: z.string().optional(),
  sampleAnswer: z.string().optional(),
})

export type GeneratedWritingPrompt = z.infer<typeof GeneratedWritingPromptSchema>

export interface WritingPromptParams {
  language: string
  cefr: string
  topic: string
  wordCount: number
}

export const writingGeneration: PromptDefinition<WritingPromptParams, typeof GeneratedWritingPromptSchema> = {
  name: 'writing-generation',
  version: PROMPT_VERSION,
  schema: GeneratedWritingPromptSchema,
  buildPrompt: (params: WritingPromptParams): string => {
    return 'You are a language assessment expert creating writing exercises for language learners. Generate a writing prompt appropriate for CEFR level ' + params.cefr + '. The topic is "' + params.topic + '". The exercise should prompt the user to produce approximately ' + params.wordCount + ' words in ' + params.language + '. Include vocabulary hints and a sample answer suitable for the level. Create a writing exercise for ' + params.cefr + ' level learners of ' + params.language + '. Topic: ' + params.topic + '. Target word count: ' + params.wordCount + '. Return JSON with: title, sourceText, sourceLanguage ("Vietnamese"), targetLanguage ("' + params.language + '"), cefrLevel ("' + params.cefr + '"), wordCount (' + params.wordCount + '), hints (array of { wordOrPhrase, meaning }), notes (optional), sampleAnswer (optional).'
  },
}
