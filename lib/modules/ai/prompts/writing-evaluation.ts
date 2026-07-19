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
    const expLang = params.explanationLanguage || 'Vietnamese'

    return `You are an expert language evaluator and teacher. Evaluate the learner's writing submission.

Task Information:
- Exercise Prompt (${params.sourceLanguage}): "${params.sourceText}"
- Target CEFR Level: ${params.cefrLevel}
- Learner Writing Submission (${params.userLanguage}): "${params.userAnswer}"
${params.sampleAnswer ? `- Model/Sample Answer: "${params.sampleAnswer}"\n` : ''}

Evaluation Instructions:
1. Score the submission from 0 to 100 based on task completion, vocabulary usage, grammar accuracy, cohesion/genre formatting, and CEFR level (${params.cefrLevel}).
2. Provide a short rating label ("rating") in ${expLang} (e.g., "Xuất sắc", "Tốt", "Cần cải thiện").
3. Write a comprehensive feedback paragraph ("detailedFeedback") in ${expLang} evaluating the performance.
4. List key strengths ("strengths") as an array of points in ${expLang}.
5. List key areas for improvement ("improvements") as an array of points in ${expLang}.
6. Provide specific corrections ("corrections") as an array of items: { "original": string, "corrected": string, "type": string, "explanation": string (in ${expLang}) }.
7. Provide a polished, optimized version of the student's submission ("suggestedAnswer") in ${params.userLanguage} that preserves the student's original idea while correcting all errors and refining style for CEFR level ${params.cefrLevel}.

All feedback, explanations, ratings, strengths, and improvements MUST be written in ${expLang}.

Return a structured JSON object matching the schema: score (0-100), rating, detailedFeedback, strengths, improvements, corrections (array of { original, corrected, type, explanation }), suggestedAnswer.`
  },
}

