import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

export const QuizAssistantSchema = z.object({
  reply: z.string().min(1),
  formulaExplanation: z.string().nullable().optional(),
  similarQuestionFound: z.boolean().default(false),
  similarQuestionDetails: z.string().nullable().optional(),
})

export type QuizAssistantResult = z.infer<typeof QuizAssistantSchema>

export interface QuizAssistantPromptParams {
  questionText: string
  options: string[]
  correctAnswer: number | number[]
  submittedAnswer?: number | number[] | null
  explanation?: string | null
  userQuery: string
  courseCode?: string
  targetOptionLetter?: string
  targetOptionText?: string
  similarQuestions?: Array<{
    text: string
    options: string[]
    correctAnswer: number | number[]
    explanation?: string | null
  }>
}

export const quizAssistantPrompt: PromptDefinition<QuizAssistantPromptParams, typeof QuizAssistantSchema> = {
  name: 'quiz_assistant',
  version: PROMPT_VERSION,
  schema: QuizAssistantSchema,
  buildPrompt: (params: QuizAssistantPromptParams): string => {
    const getLabel = (idx: number) => String.fromCharCode(65 + idx)

    const formattedOptions = params.options
      .map((opt, i) => {
        const letter = getLabel(i)
        const cleanOpt = opt.replace(/^[A-Z][\.\)]\s*/i, '')
        return `  Option ${letter}: ${cleanOpt}`
      })
      .join('\n')

    const getFormattedAnswerStr = (answer: number | number[] | null | undefined) => {
      if (answer === null || answer === undefined) return 'Not answered yet'
      const idxs = Array.isArray(answer) ? answer : [answer]
      return idxs
        .map((i) => {
          const letter = getLabel(i)
          const cleanText = (params.options[i] ?? '').replace(/^[A-Z][\.\)]\s*/i, '')
          return `Option ${letter} (${cleanText})`
        })
        .join(', ')
    }

    const correctText = getFormattedAnswerStr(params.correctAnswer)
    const submittedText = getFormattedAnswerStr(params.submittedAnswer)

    const courseStr = params.courseCode ? `subject ${params.courseCode}` : 'this subject'

    let similarSection = `In the question bank for ${courseStr}, no other question was found using this option as the correct answer.`
    if (params.similarQuestions && params.similarQuestions.length > 0) {
      similarSection = params.similarQuestions
        .map((q, idx) => {
          const qCorrect = Array.isArray(q.correctAnswer)
            ? q.correctAnswer.map((i) => getLabel(i)).join(', ')
            : getLabel(q.correctAnswer)
          return `Matching Question #${idx + 1}:\n- Question: ${q.text}\n- Correct Answer: Option ${qCorrect}`
        })
        .join('\n\n')
    }

    return `You are an AI Quiz Assistant specializing in analyzing multiple-choice questions and cross-referencing question bank data.

CURRENT QUESTION CONTEXT:
- Course Code / Exam: ${params.courseCode ?? 'N/A'}
- Question: "${params.questionText}"
- Options:
${formattedOptions}
- Correct Answer for this question: ${correctText}
- Student's Selected Answer: ${submittedText}

STUDENT INQUIRY:
"${params.userQuery}"

QUESTION BANK SEARCH RESULTS (${courseStr.toUpperCase()}):
${similarSection}

MANDATORY RESPONSE GUIDELINES (EXTREMELY CONCISE & CLEAR):

1. IF A MATCHING QUESTION IS FOUND IN ${courseStr}:
   - Start immediately with: "**YES!** In the question bank for ${courseStr}, the following question was found with **"${params.targetOptionText ?? ''}"** as the correct answer:"
   - Quote question:
     • **Question**: "[Question text]"
     • **Correct Answer in that question**: Option [Letter] (${params.targetOptionText ?? ''})

2. IF NO MATCHING QUESTION IS FOUND IN ${courseStr}:
   - Start immediately with: "**NO!** In the question bank for ${courseStr}, no other question was found that uses **"${params.targetOptionText ?? 'this option'}"** as the correct answer."
   - Explain in 1 concise sentence why for the current question, ${correctText} is the correct answer.

3. OTHER MANDATORY GUIDELINES:
   - Keep answers EXTREMELY CONCISE (under 80 - 100 words), clear, and pedagogical. Never contradict option letters between current and question bank questions.

Return standard JSON adhering to the schema:
- reply: Concise explanation, directly providing the YES/NO answer in English.
- formulaExplanation: Formula breakdown or calculation steps (if applicable, concise).
- similarQuestionFound: true if a matching question on the SAME TOPIC is found, otherwise false.
- similarQuestionDetails: Summary of found question content (if any).`
  },
}
