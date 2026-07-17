import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

export const GeneratedStorySchema = z.object({
  title: z.string().min(3),
  body: z.string().min(100),
  translation: z.string().min(100),
  vocabulary: z.array(z.object({
    word: z.string(),
    definition: z.string(),
    cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  })).min(3),
  chapters: z.array(z.object({
    heading: z.string(),
    text: z.string(),
  })).optional(),
  moral: z.string().optional(),
  wordCount: z.number().int().optional(),
})

export type GeneratedStory = z.infer<typeof GeneratedStorySchema>

export interface StoryPromptParams {
  language: string
  cefr?: string
  theme?: string
  targetLength?: number
  includeChapters?: boolean
}

export const storyGeneration: PromptDefinition<StoryPromptParams, typeof GeneratedStorySchema> = {
  name: 'story-generation',
  version: PROMPT_VERSION,
  schema: GeneratedStorySchema,
  buildPrompt: (params: StoryPromptParams): string => {
    const chapterInstruction = params.includeChapters
      ? '\n- chapters (split the story into 3-5 short chapters with headings)'
      : ''
    const themeContext = params.theme
      ? ` on the theme "${params.theme}"`
      : ' (any engaging theme suitable for language learners)'

    return `You are writing a short story for "${params.language}" learners at CEFR level ${params.cefr ?? 'A2'}${themeContext}.

Write an original, engaging short story of approximately ${params.targetLength ?? 300} characters.

Structure:
1. title (catchy, level-appropriate)
2. body (the full story in ${params.language})
3. translation (natural English translation)
4. vocabulary (extract key vocabulary with definitions)${chapterInstruction}
5. moral (optional: lesson or takeaway from the story)

Rules:
- The story must be entirely in ${params.language}
- Use vocabulary and grammar appropriate for ${params.cefr ?? 'A2'} level
- The plot should be simple but engaging
- Include some repeated vocabulary for natural reinforcement
- Avoid cultural references that require deep background knowledge
- The story should be suitable for all ages

Respond ONLY with a valid JSON object matching the provided schema.`
  },
}

