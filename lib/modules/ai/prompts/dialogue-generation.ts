import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

export const GeneratedDialogueSchema = z.object({
  title: z.string().min(3),
  setting: z.string().min(5),
  participants: z.array(z.object({
    name: z.string(),
    role: z.string(),
  })).min(2).max(4),
  lines: z.array(z.object({
    speaker: z.string(),
    text: z.string(),
    translation: z.string(),
    vocabulary: z.array(z.object({
      word: z.string(),
      definition: z.string(),
    })).optional(),
  })).min(4).max(30),
})

export type GeneratedDialogue = z.infer<typeof GeneratedDialogueSchema>

export interface DialoguePromptParams {
  language: string
  topic: string
  cefr?: string
  lineCount?: number
  participants?: number
}

export const dialogueGeneration: PromptDefinition<DialoguePromptParams, typeof GeneratedDialogueSchema> = {
  name: 'dialogue-generation',
  version: PROMPT_VERSION,
  schema: GeneratedDialogueSchema,
  buildPrompt: (params: DialoguePromptParams): string => {
    return `You are creating a ${params.language} dialogue for learners at CEFR level ${params.cefr ?? 'A2'} on the topic "${params.topic}".

Generate a natural conversation with ${params.participants ?? 2} participants and ${params.lineCount ?? 10} exchange lines.

Structure:
1. title (engaging title)
2. setting (where/when the conversation takes place)
3. participants (name + role for each)
4. lines (dialogue exchanges)

Each line has:
- speaker (participant name)
- text (dialogue in ${params.language})
- translation (English translation)
- vocabulary (optional: key words from this line with definitions)

Rules:
- All dialogue MUST be in ${params.language}
- Lines should feel natural, not like textbook examples
- Include common expressions and fillers appropriate to the level
- Progress naturally (greeting → topic → conclusion)
- Each speaker should have roughly equal speaking time
- Include culturally authentic interactions

Respond ONLY with a valid JSON object matching the provided schema.`
  },
}

