import { z } from 'zod'

export interface WritingPromptParams {
  language: string
  cefr: string
  topic: string
  wordCount: number
}

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

export function writingGeneration(params: WritingPromptParams) {
  const { language, cefr, topic, wordCount } = params
  const system = 'You are a language assessment expert creating writing exercises for language learners. Generate a writing prompt appropriate for CEFR level ' + cefr + '. The topic is "' + topic + '". The exercise should prompt the user to produce approximately ' + wordCount + ' words in ' + language + '. Include vocabulary hints and a sample answer suitable for the level.'
  const user = 'Create a writing exercise for ' + cefr + ' level learners of ' + language + '. Topic: ' + topic + '. Target word count: ' + wordCount + '. Return JSON with: title, sourceText, sourceLanguage ("Vietnamese"), targetLanguage ("' + language + '"), cefrLevel ("' + cefr + '"), wordCount (' + wordCount + '), hints (array of { wordOrPhrase, meaning }), notes (optional), sampleAnswer (optional).'
  return { system, user }
}
