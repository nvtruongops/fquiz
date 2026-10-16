import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

export const GeneratedWritingEvalSchema = z.object({
  score: z.number().min(0).max(100),
  rating: z.string(),
  detailedFeedback: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  corrections: z.array(z.object({
    original: z.string(),
    corrected: z.string(),
    type: z.string(),
    explanation: z.string(),
  })).optional(),
  suggestedAnswer: z.string().optional(),
})

export type GeneratedWritingEval = z.infer<typeof GeneratedWritingEvalSchema>

export interface WritingEvalPromptParams {
  sourceText: string
  sourceLanguage: string
  userAnswer: string
  userLanguage: string
  sampleAnswer?: string
  cefrLevel: string
  explanationLanguage?: string
}

export const writingEvaluation: PromptDefinition<WritingEvalPromptParams, typeof GeneratedWritingEvalSchema> = {
  name: 'writing-evaluation',
  version: PROMPT_VERSION,
  schema: GeneratedWritingEvalSchema,
  buildPrompt: (params: WritingEvalPromptParams): string => {
    const expLang = params.explanationLanguage || 'English'

    return `You are an expert language evaluator and teacher. Evaluate the learner's writing submission.

Task Information:
- Exercise Prompt (${params.sourceLanguage}): "${params.sourceText}"
- Target CEFR Level: ${params.cefrLevel}
- Learner Writing Submission (${params.userLanguage}): "${params.userAnswer}"
${params.sampleAnswer ? `- Model/Sample Answer: "${params.sampleAnswer}"\n` : ''}

CRITICAL LANGUAGE MANDATE:
Regardless of what language the Exercise Prompt ("${params.sourceLanguage}") or Learner Writing Submission ("${params.userLanguage}") is written in, ALL evaluation feedback text MUST BE WRITTEN IN ${expLang.toUpperCase()}.
This means:
- "rating": MUST be a short rating label in ${expLang} (e.g. "Excellent", "Good", "Satisfactory", "Needs Improvement").
- "detailedFeedback": MUST be written entirely in ${expLang}.
- "strengths": MUST be an array of points written in ${expLang}.
- "improvements": MUST be an array of points written in ${expLang}.
- "corrections": Each item's "explanation" field MUST be written in ${expLang}.
- "suggestedAnswer": This is the ONLY field that MUST be written in the learner's submission language (${params.userLanguage}) as a corrected and polished version of their writing.

Evaluation Instructions:
1. Score the submission from 0 to 100 based on task completion, vocabulary usage, grammar accuracy, cohesion/genre formatting, and CEFR level (${params.cefrLevel}).
2. Provide a short rating label ("rating") in ${expLang}.
3. Write a comprehensive feedback paragraph ("detailedFeedback") in ${expLang}.
4. List key strengths ("strengths") in ${expLang}.
5. List key areas for improvement ("improvements") in ${expLang}.
6. Provide specific corrections ("corrections") as: { "original": string, "corrected": string, "type": string, "explanation": string (in ${expLang}) }.
7. Provide a polished version of the student's submission ("suggestedAnswer") in ${params.userLanguage}.

STRICT RULE: Output all feedback exclusively in ${expLang}.

Return a structured JSON object matching the schema.`
  },
}

