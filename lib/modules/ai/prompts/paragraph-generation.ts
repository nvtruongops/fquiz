import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

export const GeneratedParagraphSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  translation: z.string().min(1),
  vocabulary: z.preprocess(
    (val) => {
      if (Array.isArray(val)) {
        return val.map((item) => {
          if (typeof item === 'string') {
            return { lemma: item, display: item, definition: '', cefrLevel: null }
          }
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            const obj = item as Record<string, unknown>
            return {
              lemma: String(obj.lemma ?? obj.word ?? obj.term ?? obj.text ?? ''),
              display: String(obj.display ?? obj.word ?? obj.lemma ?? obj.term ?? ''),
              definition: String(obj.definition ?? obj.meaning ?? obj.translation ?? ''),
              cefrLevel: obj.cefrLevel ?? null,
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
      cefrLevel: z.string().nullable().optional(),
    })).min(1),
  ),
  comprehensionQuestions: z.preprocess(
    (val) => {
      if (Array.isArray(val)) {
        return val.map((item) => {
          if (typeof item === 'string') {
            return { question: item, options: [], correctIndex: 0 }
          }
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            const obj = item as Record<string, unknown>
            const correct = Number(obj.correctIndex ?? obj.correctAnswer ?? obj.answer ?? obj.correct ?? 0)
            let options = Array.isArray(obj.options) ? obj.options : []
            if (!Array.isArray(options)) {
              options = []
            }
            return {
              question: String(obj.question ?? ''),
              options,
              correctIndex: isNaN(correct) ? 0 : correct,
            }
          }
          return item
        })
      }
      return val
    },
    z.array(z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number().int().min(0),
    })).nullable().optional(),
  ),
  wordCount: z.number().int().nullable().optional(),
})

export type GeneratedParagraph = z.infer<typeof GeneratedParagraphSchema>

export interface ParagraphPromptParams {
  language: string
  explanationLanguage?: string
  topic: string
  cefr?: string
  paragraphType?: 'narrative' | 'descriptive' | 'dialogue' | 'informational' | 'email' | 'essay' | 'news'
  genre?: string
  tone?: string
  targetLength?: number
}

export const paragraphGeneration: PromptDefinition<ParagraphPromptParams, typeof GeneratedParagraphSchema> = {
  name: 'paragraph-generation',
  version: PROMPT_VERSION,
  schema: GeneratedParagraphSchema,
  buildPrompt: (params: ParagraphPromptParams): string => {
    const expLang = params.explanationLanguage || 'Vietnamese'
    const genreInstruction = params.genre ? `\nWriting Genre/Format: ${params.genre}` : ''
    const toneInstruction = params.tone ? `\nTone & Style: ${params.tone}` : ''

    return `You are a language educator creating a ${params.paragraphType ?? 'informational'} reading passage for "${params.language}" learners at level ${params.cefr ?? 'A2'} on topic "${params.topic}".${genreInstruction}${toneInstruction}

Generate a reading passage with the following structure:

1. title (engaging title in ${params.language})
2. body (${params.targetLength ?? 150}-${(params.targetLength ?? 150) + 120} words, natural flowing text in ${params.language})
3. translation (natural translation written in ${expLang})
4. vocabulary (5-8 objects: each with fields: "lemma", "display", "definition" written in ${expLang}, "cefrLevel")
5. comprehensionQuestions (optional: 3-4 objects with fields: "question", "options" (array of 4 options), "correctIndex" (0-3))

Rules:
- The passage body MUST be entirely in ${params.language}.
- Translations, definitions, and questions MUST be written in ${expLang}.
- Use vocabulary and grammar appropriate for level ${params.cefr ?? 'A2'}.

Respond ONLY with a valid JSON object matching the provided schema.`
  },
}

