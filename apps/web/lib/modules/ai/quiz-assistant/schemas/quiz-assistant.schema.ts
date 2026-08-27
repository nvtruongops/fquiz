import { z } from 'zod'

export const QuizAIIntentEnum = z.enum([
  'EXPLAIN_WRONG_ANSWER',
  'EXPLAIN_CORRECT_ANSWER',
  'SOLVE_QUESTION',
  'EXPLAIN_FORMULA',
  'FIND_SIMILAR_QUESTION',
  'COMPARE_OPTIONS',
  'GENERAL_INQUIRY',
])
export type QuizAIIntent = z.infer<typeof QuizAIIntentEnum>

// Schema cho Request từ Client
export const QuizAssistantRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID không được để trống'),
  questionIndex: z.number().int().min(0, 'Question index phải >= 0'),
  userQuery: z.string().min(1, 'Câu hỏi không được để trống').max(1000, 'Câu hỏi quá dài'),
  intent: QuizAIIntentEnum.optional(),
  questionText: z.string().optional(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.union([z.number(), z.array(z.number())]).optional(),
  explanation: z.string().nullable().optional(),
})
export type QuizAssistantRequest = z.infer<typeof QuizAssistantRequestSchema>

// Schema cho LLM Generation Output thuần túy
export const LLMQuizAssistantOutputSchema = z.object({
  reply: z.string().min(1),
  formulaExplanation: z.string().nullable().optional(),
  similarQuestionFound: z.boolean().default(false),
  similarQuestionDetails: z.string().nullable().optional(),
})
export type LLMQuizAssistantOutput = z.infer<typeof LLMQuizAssistantOutputSchema>

// Schema Public Response trả về Client qua ResponseMapper (Tương thích ngược 100%)
export const QuizAssistantResponseSchema = z.object({
  intent: QuizAIIntentEnum,
  reply: z.string(),
  formulaExplanation: z.string().nullable().optional(),
  similarQuestionFound: z.boolean(),
  similarQuestionDetails: z.string().nullable().optional(),
  confidence: z.enum(['high', 'medium', 'low']),
  responseMode: z.enum(['llm', 'db_fallback', 'cached']),
  fallback: z.boolean(),
  evidenceUsed: z.array(
    z.object({
      sourceType: z.enum(['question_bank', 'quiz', 'course_document']),
      sourceId: z.string(),
      snippet: z.string(),
      relevance: z.number().min(0).max(1),
      matchedAnswerText: z.string().optional(),
      breakdown: z.object({
        optionScore: z.number().min(0).max(1),
        questionScore: z.number().min(0).max(1),
        subjectScore: z.number().min(0).max(1),
      }).optional(),
    })
  ),
})
export type QuizAssistantResponse = z.infer<typeof QuizAssistantResponseSchema>
