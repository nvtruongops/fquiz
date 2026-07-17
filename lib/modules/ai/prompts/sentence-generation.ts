import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

export const GeneratedSentenceSchema = z.object({
  text: z.string().min(5),
  translation: z.string().min(5),
  vocabulary: z.array(z.object({
    lemma: z.string(),
    display: z.string(),
    definition: z.string(),
  })).optional(),
  grammarHighlights: z.array(z.object({
    pattern: z.string(),
    explanation: z.string(),
  })).optional(),
  difficulty: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
})

export type GeneratedSentence = z.infer<typeof GeneratedSentenceSchema>

export interface SentencePromptParams {
  language: string
  topic: string
  cefr?: string
  count?: number
  includeVocabulary?: boolean
  targetVocab?: string[]
}

export const sentenceGeneration: PromptDefinition<SentencePromptParams, typeof GeneratedSentenceSchema> = {
  name: 'sentence-generation',
  version: PROMPT_VERSION,
  schema: GeneratedSentenceSchema,
  buildPrompt: (params: SentencePromptParams): string => {
    const vocabConstraint = params.targetVocab?.length
      ? `\n\nEach sentence MUST naturally include at least one of these vocabulary terms: ${params.targetVocab.join(', ')}`
      : ''
    const vocabInstruction = params.includeVocabulary !== false
      ? '\n- vocabulary (key terms with definitions extracted from the sentence)'
      : ''

    return `You are a language educator creating example sentences for "${params.language}" learners at CEFR level ${params.cefr ?? 'A2'} on the topic "${params.topic}".

Generate ${params.count ?? 5} natural, useful sentences.

For each sentence, provide:
1. text (the sentence in ${params.language})
2. translation (natural English translation)
${vocabInstruction}
3. grammarHighlights (optional: 1-2 grammar patterns with explanations)
4. difficulty${vocabConstraint}

Rules:
- Sentences must be realistic and usable in everyday conversation
- Progress from simple to slightly complex
- Each sentence must be a complete, grammatically correct sentence
- Include a variety of sentence structures (declarative, question, conditional where appropriate)

Respond ONLY with a valid JSON array of objects matching the provided schema.`
  },
}

