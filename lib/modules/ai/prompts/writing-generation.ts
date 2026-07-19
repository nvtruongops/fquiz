import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

export const GeneratedWritingPromptSchema = z.object({
  title: z.string(),
  sourceText: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  cefrLevel: z.string(),
  wordCount: z.preprocess((v) => Number(v) || 150, z.number()),
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
  genre?: string
  context?: string
  explanationLanguage?: string
}

export const writingGeneration: PromptDefinition<WritingPromptParams, typeof GeneratedWritingPromptSchema> = {
  name: 'writing-generation',
  version: PROMPT_VERSION,
  schema: GeneratedWritingPromptSchema,
  buildPrompt: (params: WritingPromptParams): string => {
    const expLang = params.explanationLanguage || 'Vietnamese'
    const genreInstruction = params.genre ? `\n- Text Genre / Format: ${params.genre}` : ''
    const contextInstruction = params.context ? `\n- Specific Situation / Context: ${params.context}` : ''

    return `You are a language education and content generation expert creating standardized reading & writing learning materials.

Parameters:
- Content Language: ${params.language}
- CEFR Level: ${params.cefr}
- Topic: ${params.topic}${genreInstruction}${contextInstruction}
- Target Word Count: approximately ${params.wordCount} words

Instructions:
1. Generate the ACTUAL, FULL TEXT / PASSAGE ("sourceText") in ${params.language} strictly adhering to the requested topic, text genre (e.g. News Report, Email, Essay, Story, Paragraph), specific situational context, and target length (~${params.wordCount} words).
2. CRITICAL: Do NOT write meta-instructions or assignment prompts (e.g. DO NOT write "Write a report about..."). Instead, write the COMPLETE, AUTHENTIC TEXT ITSELF with proper title/headline, lead paragraph, and body structure required by the genre.
3. Do NOT generate any vocabulary hints, writing tips, or sample answers. Leave "hints" as [], "notes" as "", and "sampleAnswer" as "".
4. Provide a clear, engaging title ("title") for the passage.

Return JSON matching the schema:
{
  "title": string (title of the passage),
  "sourceText": string (the complete, actual text/passage content),
  "sourceLanguage": "${params.language}",
  "targetLanguage": "${expLang}",
  "cefrLevel": "${params.cefr}",
  "wordCount": ${params.wordCount},
  "hints": [],
  "notes": "",
  "sampleAnswer": ""
}`
  },
}

