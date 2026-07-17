import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

const QuestionOptionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean(),
})

export const GeneratedQuizSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  questions: z.array(z.object({
    text: z.string().min(5),
    type: z.enum(['multiple_choice', 'true_false', 'fill_blank', 'matching']),
    options: z.array(QuestionOptionSchema).min(2).max(6),
    explanation: z.string().min(5).optional(),
    difficulty: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  })).min(1).max(20),
})

export type GeneratedQuiz = z.infer<typeof GeneratedQuizSchema>

export interface QuizPromptParams {
  language: string
  topic: string
  cefr?: string
  questionCount?: number
  questionTypes?: string[]
  sourceContent?: string
}

export const quizGeneration: PromptDefinition<QuizPromptParams, typeof GeneratedQuizSchema> = {
  name: 'quiz-generation',
  version: PROMPT_VERSION,
  schema: GeneratedQuizSchema,
  buildPrompt: (params: QuizPromptParams): string => {
    const types = params.questionTypes?.length
      ? params.questionTypes.join(', ')
      : 'multiple_choice, true_false'
    const sourceSection = params.sourceContent
      ? `\n\nBase the quiz on this content:\n---\n${params.sourceContent}\n---`
      : ''

    return `You are creating a ${params.language} language quiz at CEFR level ${params.cefr ?? 'A2'} on the topic "${params.topic}".${sourceSection}

Generate a quiz with ${params.questionCount ?? 10} questions using these types: ${types}.

Structure:
1. title (engaging quiz title)
2. description (brief instructions for the learner)
3. questions (array of question objects)

Each question has:
- text (the question in ${params.language})
- type (one of: ${types})
- options (array of { text, isCorrect } - exactly one correct answer)
- explanation (brief explanation of the correct answer)
- difficulty (CEFR level of this question)

Rules:
- Questions and options must be in ${params.language}
- Explanations can be in English
- Distribute correct answers evenly across option positions
- Ensure distractors are plausible but clearly incorrect
- Mix easy and challenging questions

Respond ONLY with a valid JSON object matching the provided schema.`
  },
}

