import { getPublishedAnswerError } from '@fquiz/models'
import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

const QuestionOptionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean(),
})

export const GeneratedQuizSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  questions: z.preprocess(
    (val) => {
      if (Array.isArray(val)) {
        return val.map((question) => {
          if (typeof question === 'string') {
            return { text: question, type: 'multiple_choice', options: [{ text: '', isCorrect: true }], explanation: null, difficulty: null }
          }
          if (question && typeof question === 'object' && !Array.isArray(question)) {
            const q = question as Record<string, unknown>
            if (Array.isArray(q.options)) {
              q.options = q.options.map((opt: unknown) => {
                if (typeof opt === 'string') {
                  return { text: opt, isCorrect: false }
                }
                return opt
              })
            }
          }
          return question
        })
      }
      return val
    },
    z.array(z.object({
      text: z.string().min(1),
      type: z.string().optional().default('multiple_choice'),
      options: z.array(QuestionOptionSchema).min(2),
      explanation: z.string().nullable().optional(),
      difficulty: z.string().nullable().optional(),
    }).superRefine((question, ctx) => {
      const error = getPublishedAnswerError({ text: question.text, options: question.options.map(option => option.text), correct_answer: question.options.flatMap((option, index) => option.isCorrect ? [index] : []) })
      if (error) ctx.addIssue({ code: 'custom', message: error, path: ['options'] })
    })).min(1),
  ),
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

function resolveQuestionTypes(params: QuizPromptParams): string {
  return params.questionTypes?.length ? params.questionTypes.join(', ') : 'multiple_choice, true_false'
}

function resolveSourceSection(sourceContent?: string): string {
  return sourceContent ? `\n\nBase the quiz on this content:\n---\n${sourceContent}\n---` : ''
}

function buildQuizPrompt(params: QuizPromptParams): string {
  const types = resolveQuestionTypes(params)
  return [
    `You are creating a ${params.language} language quiz at CEFR level ${params.cefr ?? 'A2'} on the topic "${params.topic}".${resolveSourceSection(params.sourceContent)}`,
    '',
    `Generate a quiz with ${params.questionCount ?? 10} questions using these types: ${types}.`,
    '',
    'Structure:',
    '1. title (engaging quiz title)',
    '2. description (brief instructions for the learner)',
    '3. questions (array of question objects)',
    '',
    'Each question has:',
    `- text (the question in ${params.language})`,
    `- type (one of: ${types})`,
    '- options (array of { text, isCorrect } - exactly one correct answer)',
    '- explanation (brief explanation of the correct answer)',
    '- difficulty (CEFR level of this question)',
    '',
    'Rules:',
    `- Questions and options must be in ${params.language}`,
    '- Explanations can be in English',
    '- Distribute correct answers evenly across option positions',
    '- Ensure distractors are plausible but clearly incorrect',
    '- Mix easy and challenging questions',
    '',
    'Respond ONLY with a valid JSON object matching the provided schema.',
  ].join('\n')
}

export const quizGeneration: PromptDefinition<QuizPromptParams, typeof GeneratedQuizSchema> = {
  name: 'quiz-generation',
  version: PROMPT_VERSION,
  schema: GeneratedQuizSchema,
  buildPrompt: buildQuizPrompt,
}