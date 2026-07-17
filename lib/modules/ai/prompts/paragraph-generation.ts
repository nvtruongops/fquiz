import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

export const GeneratedParagraphSchema = z.object({
  title: z.string().min(3),
  body: z.string().min(50),
  translation: z.string().min(50),
  vocabulary: z.array(z.object({
    lemma: z.string(),
    display: z.string(),
    definition: z.string(),
    cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  })).min(3),
  comprehensionQuestions: z.array(z.object({
    question: z.string(),
    options: z.array(z.string()).length(4),
    correctIndex: z.number().int().min(0).max(3),
  })).optional(),
  wordCount: z.number().int().optional(),
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
4. vocabulary (extract 5-8 key vocabulary items from the passage with definitions)
5. comprehensionQuestions (optional: 3-4 multiple-choice questions testing understanding)

Rules:
- The body text must be entirely in ${params.language}
- Use vocabulary and grammar appropriate for ${params.cefr ?? 'A2'} level
- Make the content interesting and culturally relevant
- The passage should be self-contained and meaningful
- Comprehension questions must be answerable from the text alone

Respond ONLY with a valid JSON object matching the provided schema.`
  },
}

