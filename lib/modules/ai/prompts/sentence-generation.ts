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
  explanationLanguage?: string
  topic: string
  cefr?: string
  count?: number
  includeVocabulary?: boolean
  targetVocab?: string[]
  context?: string
}

export const sentenceGeneration: PromptDefinition<SentencePromptParams, z.ZodArray<typeof GeneratedSentenceSchema>> = {
  name: 'sentence-generation',
  version: PROMPT_VERSION,
  schema: z.array(GeneratedSentenceSchema),
  buildPrompt: (params: SentencePromptParams): string => {
    const expLang = params.explanationLanguage || 'Vietnamese'
    const vocabConstraint = params.targetVocab?.length
      ? `\n\nEach sentence MUST naturally include at least one of these vocabulary terms: ${params.targetVocab.join(', ')}`
      : ''
    const vocabInstruction = params.includeVocabulary !== false
      ? `\n- vocabulary (optional: array of objects with fields: "lemma", "display", "definition" written in ${expLang})`
      : ''
    const contextInstruction = params.context ? `\n- Specific situational context: "${params.context}"` : ''

    return `You are a language educator creating example sentences for "${params.language}" learners at level ${params.cefr ?? 'A2'} on the topic "${params.topic}".${contextInstruction}

Generate ${params.count ?? 5} natural, useful sentences in ${params.language}.

For each sentence, provide:
1. text (the sentence in ${params.language})
2. translation (natural translation written in ${expLang})
${vocabInstruction}
3. grammarHighlights (optional: 1-2 grammar patterns with explanations written in ${expLang})
4. difficulty (${params.cefr ?? 'A2'})${vocabConstraint}

Rules:
- Translations, definitions, and grammar explanations MUST be in ${expLang}.
- Sentences must be realistic and usable in everyday conversation in ${params.language}.
- Progress from simple to slightly complex.

Respond ONLY with a valid JSON array of objects matching the provided schema.`
  },
}

