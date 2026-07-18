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
  topic: string
  cefr?: string
  paragraphType?: 'narrative' | 'descriptive' | 'dialogue' | 'informational'
  targetLength?: number
}

export const paragraphGeneration: PromptDefinition<ParagraphPromptParams, typeof GeneratedParagraphSchema> = {
  name: 'paragraph-generation',
  version: PROMPT_VERSION,
  schema: GeneratedParagraphSchema,
  buildPrompt: (params: ParagraphPromptParams): string => {
    return `You are creating a ${params.paragraphType ?? 'informational'} reading passage for "${params.language}" learners at CEFR level ${params.cefr ?? 'A2'} on the topic "${params.topic}".

Generate a reading passage with the following structure:

1. title (engaging, level-appropriate)
2. body (${params.targetLength ?? 150}-${(params.targetLength ?? 150) + 100} characters, natural flowing text)
3. translation (natural English translation of the entire passage)
4. vocabulary (5-8 objects: each with fields: "lemma", "display", "definition", "cefrLevel")
5. comprehensionQuestions (optional: 3-4 objects with fields: "question", "options" (string array), "correctIndex" (number))

Rules:
- The body text must be entirely in ${params.language}
- Use vocabulary and grammar appropriate for ${params.cefr ?? 'A2'} level
- Make the content interesting and culturally relevant
- The passage should be self-contained and meaningful
- Comprehension questions must be answerable from the text alone

Respond ONLY with a valid JSON object matching the provided schema.`
  },
}

