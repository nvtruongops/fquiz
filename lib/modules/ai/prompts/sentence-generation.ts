import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

export const GeneratedSentenceSchema = z.object({
  text: z.string().min(1),
  translation: z.string().min(1),
  vocabulary: z.preprocess(
    (val) => {
      if (Array.isArray(val)) {
        return val.map((item) => {
          if (typeof item === 'string') {
            return { lemma: item, display: item, definition: '' }
          }
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            const obj = item as Record<string, unknown>
            return {
              lemma: String(obj.lemma ?? obj.word ?? obj.term ?? obj.text ?? ''),
              display: String(obj.display ?? obj.word ?? obj.lemma ?? obj.term ?? ''),
              definition: String(obj.definition ?? obj.meaning ?? obj.translation ?? ''),
            }
          }
          return item
        })
      }
      return val
    },
    z.array(z.object({
      lemma: z.string(),
      display: z.string(),
      definition: z.string(),
    })).nullable().optional(),
  ),
  grammarHighlights: z.preprocess(
    (val) => {
      if (Array.isArray(val)) {
        return val.map((item) => {
          if (typeof item === 'string') {
            return { pattern: item, explanation: '' }
          }
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            const obj = item as Record<string, unknown>
            return {
              pattern: String(obj.pattern ?? obj.rule ?? obj.name ?? ''),
              explanation: String(obj.explanation ?? obj.description ?? obj.detail ?? ''),
            }
          }
          return item
        })
      }
      return val
    },
    z.array(z.object({
      pattern: z.string(),
      explanation: z.string(),
    })).nullable().optional(),
  ),
  difficulty: z.string().nullable().optional(),
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

export const sentenceGeneration: PromptDefinition<SentencePromptParams, z.ZodArray<typeof GeneratedSentenceSchema>> = {
  name: 'sentence-generation',
  version: PROMPT_VERSION,
  schema: z.array(GeneratedSentenceSchema),
  buildPrompt: (params: SentencePromptParams): string => {
    const vocabConstraint = params.targetVocab?.length
      ? `\n\nEach sentence MUST naturally include at least one of these vocabulary terms: ${params.targetVocab.join(', ')}`
      : ''
    const vocabInstruction = params.includeVocabulary !== false
      ? '\n- vocabulary (optional: array of objects with fields: "lemma", "display", "definition")'
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

