import { NextResponse } from 'next/server'
import { z } from 'zod'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { container } from '@/lib/core/di'
import type { AIContentService } from '@/lib/modules/ai/services/ai-content.service'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Question } from '@/lib/modules/quiz/models/Question'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import type { JWTPayload } from '@/lib/modules/auth/auth'
import type { IQuestion } from '@/lib/modules/quiz/types/quiz'
import { GeminiProvider } from '@/lib/core/ai/gemini-provider'
import { quizAssistantPrompt, type QuizAssistantResult } from '@/lib/modules/ai/prompts/quiz-assistant.prompt'

export const dynamic = 'force-dynamic'

const QuizAssistantRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID không được để trống'),
  questionIndex: z.number().int().min(0, 'Question index phải >= 0'),
  userQuery: z.string().min(1, 'Câu hỏi không được để trống').max(1000, 'Câu hỏi quá dài'),
  questionText: z.string().optional(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.union([z.number(), z.array(z.number())]).optional(),
  explanation: z.string().nullable().optional(),
})

/**
 * POST /api/v1/ai/quiz-assistant
 * Dev-only endpoint to assist quiz session questions via Gemini AI & Question Bank search.
 */
export const POST = withAuth(
  async (req: Request, { payload }: { payload: JWTPayload }) => {
    try {
      let body: unknown
      try {
        body = await req.json()
      } catch {
        return NextResponse.json({ error: 'Body JSON không hợp lệ' }, { status: 400 })
      }

      const parsed = QuizAssistantRequestSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dữ liệu yêu cầu không hợp lệ', details: parsed.error.issues },
          { status: 400 }
        )
      }

      const { sessionId, questionIndex, userQuery, questionText, options, correctAnswer, explanation } = parsed.data

      await connectDB()

      // Fetch session
      const session = (await QuizSession.findById(sessionId).lean()) as any
      if (!session) {
        return NextResponse.json({ error: 'Không tìm thấy phiên làm bài' }, { status: 404 })
      }

      // Verify owner
      if (session.student_id?.toString() !== payload.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Resolve quiz doc & question
      const quizRes = Quiz.findById(session.quiz_id) as any
      const quizDoc = quizRes && typeof quizRes.select === 'function'
        ? (await quizRes.select('course_code category_id questions question_refs').lean()) as any
        : (await Quiz.findById(session.quiz_id)) as any
      const fullCourseCode = (quizDoc?.course_code || '').trim().toUpperCase()
      // Extract subject code e.g. "PMG201C" from "PMG201C_FA24_FE"
      const courseCode = (fullCourseCode.split('_')[0] || fullCourseCode).toUpperCase()

      // Resolve question mapping UI index -> actual question index via session.question_order
      const questionOrder = session.question_order || []
      const actualIndex = typeof questionOrder[questionIndex] === 'number'
        ? questionOrder[questionIndex]
        : questionIndex

      let currentQuestion: IQuestion | null = null

      if (questionText && Array.isArray(options) && options.length > 0) {
        currentQuestion = {
          _id: new mongoose.Types.ObjectId(),
          text: questionText,
          options,
          correct_answer: correctAnswer ?? 0,
          explanation: explanation ?? undefined,
        }
      } else if (Array.isArray(session.questions_cache) && session.questions_cache[actualIndex]) {
        currentQuestion = session.questions_cache[actualIndex]
      } else if (quizDoc) {
        if (Array.isArray(quizDoc.questions) && quizDoc.questions[actualIndex]) {
          currentQuestion = quizDoc.questions[actualIndex]
        } else if (Array.isArray(quizDoc.question_refs) && quizDoc.question_refs[actualIndex]) {
          const standaloneQ = (await Question.findById(quizDoc.question_refs[actualIndex]).lean()) as any
          if (standaloneQ) {
            currentQuestion = {
              _id: standaloneQ._id.toString(),
              text: standaloneQ.text,
              options: standaloneQ.options,
              correct_answer: standaloneQ.correct_answer,
              explanation: standaloneQ.explanation,
              image_url: standaloneQ.image_url,
            }
          }
        }
      }

      if (!currentQuestion) {
        return NextResponse.json({ error: 'Không tìm thấy thông tin câu hỏi' }, { status: 400 })
      }

      // Get user's submitted answer if any
      const userAnswers = session.user_answers || []
      const submitted = userAnswers.find((a: any) => a.question_index === questionIndex)
      const submittedAnswer = submitted
        ? (submitted.answer_indexes && submitted.answer_indexes.length > 0 ? submitted.answer_indexes : submitted.answer_index)
        : null

      // Target Option Detection (e.g. A, B, C, D)
      let targetOptionIndex: number | null = null
      let targetOptionLetter = ''
      const letterMatch = userQuery.match(/(?:đáp án|phương án|chọn|câu)\s*([A-D])\b/i) || userQuery.match(/(?:^|\s+)([A-D])(?:\s+|\?|$)/i)
      if (letterMatch) {
        targetOptionLetter = (letterMatch[1] || letterMatch[2] || '').toUpperCase()
        if (targetOptionLetter) {
          targetOptionIndex = targetOptionLetter.charCodeAt(0) - 65
        }
      }

      let targetOptionText = ''
      if (targetOptionIndex !== null && currentQuestion.options[targetOptionIndex]) {
        targetOptionText = currentQuestion.options[targetOptionIndex].replace(/^[A-Z][\.\)]\s*/i, '').trim()
      } else if (submittedAnswer !== null && submittedAnswer !== undefined) {
        const subIdx = Array.isArray(submittedAnswer) ? submittedAnswer[0] : submittedAnswer
        if (subIdx !== undefined && currentQuestion.options[subIdx]) {
          targetOptionLetter = String.fromCharCode(65 + subIdx)
          targetOptionText = currentQuestion.options[subIdx].replace(/^[A-Z][\.\)]\s*/i, '').trim()
        }
      }

      // Targeted Question Bank Search strictly across the ENTIRE subject (e.g. PMG201C)
      let similarQuestions: Array<{ text: string; options: string[]; correctAnswer: number | number[]; explanation?: string | null }> = []

      if (targetOptionText && targetOptionText.length >= 3) {
        const safeTargetText = targetOptionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const targetRegex = new RegExp(safeTargetText, 'i')

        // 1. Primary: Search QuestionBank collection by category_id (entire subject question bank)
        if (quizDoc?.category_id) {
          const bankDocs = await QuestionBank.find({ category_id: quizDoc.category_id })
            .select('text options correct_answer explanation')
            .lean()

          for (const q of bankDocs) {
            if (q.text === currentQuestion.text) continue
            const correctIdxs = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer]
            const correctTexts = correctIdxs.map((i: number) => q.options?.[i] ?? '')
            const matchesCorrect = correctTexts.some((t: string) => targetRegex.test(t))

            if (matchesCorrect) {
              similarQuestions.push({
                text: q.text,
                options: q.options || [],
                correctAnswer: q.correct_answer,
                explanation: q.explanation,
              })
              if (similarQuestions.length >= 2) break
            }
          }
        }

        // 2. Secondary: Search all Quizzes matching subject prefix (e.g. ^PMG201C)
        if (similarQuestions.length === 0 && courseCode) {
          const findRes = Quiz.find({
            course_code: new RegExp(`^${courseCode}`, 'i'),
          }) as any
          const courseQuizzes = findRes && typeof findRes.select === 'function'
            ? await findRes.select('questions course_code').lean()
            : []

          for (const qz of courseQuizzes) {
            if (!Array.isArray(qz.questions)) continue
            for (const q of qz.questions) {
              if (q._id?.toString() === currentQuestion._id?.toString() || q.text === currentQuestion.text) continue
              const correctIdxs = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer]
              const correctTexts = correctIdxs.map((i: number) => q.options?.[i] ?? '')
              const matchesCorrect = correctTexts.some((t: string) => targetRegex.test(t))

              if (matchesCorrect) {
                similarQuestions.push({
                  text: q.text,
                  options: q.options || [],
                  correctAnswer: q.correct_answer,
                  explanation: q.explanation,
                })
                if (similarQuestions.length >= 2) break
              }
            }
            if (similarQuestions.length >= 2) break
          }
        }
      }

      // Call AI Content Service with graceful fallback if primary provider fails
      const aiContentService = container.resolve<AIContentService>('AIContentService')
      const promptParams = {
        questionId: currentQuestion._id?.toString() || currentQuestion.text,
        questionIndex: actualIndex,
        questionText: currentQuestion.text,
        options: currentQuestion.options,
        correctAnswer: currentQuestion.correct_answer,
        submittedAnswer,
        explanation: currentQuestion.explanation,
        userQuery,
        courseCode,
        targetOptionLetter,
        targetOptionText,
        similarQuestions,
      }

      let result: any
      try {
        result = await aiContentService.generate<QuizAssistantResult>({
          type: 'quiz_assistant',
          params: promptParams,
          sourceType: 'QuizSession',
          sourceId: sessionId,
        })
      } catch (genErr) {
        console.warn('POST /api/v1/ai/quiz-assistant LLM Provider unavailable (' + (genErr instanceof Error ? genErr.message : String(genErr)) + '), using DB structured fallback')
        
        const hasSimilar = similarQuestions.length > 0
        const courseStr = courseCode ? `môn ${courseCode}` : 'môn học này'
        
        let replyText = ''
        if (hasSimilar) {
          const q0 = similarQuestions[0]
          const getLabel = (idx: number) => String.fromCharCode(65 + idx)
          const qCorrect = Array.isArray(q0.correctAnswer) ? q0.correctAnswer.map((i) => getLabel(i)).join(', ') : getLabel(q0.correctAnswer)
          replyText = `**CÓ!** Trong ngân hàng đề ${courseStr}, tìm thấy câu hỏi sau có đáp án đúng là **"${targetOptionText}"**:\n\n• **Đề bài**: "${q0.text}"\n• **Đáp án đúng trong câu đó**: Phương án ${qCorrect} (${targetOptionText})`
        } else {
          const getLabel = (idx: number) => String.fromCharCode(65 + idx)
          const currentCorrectStr = Array.isArray(currentQuestion.correct_answer)
            ? currentQuestion.correct_answer.map((i) => `Phương án ${getLabel(i)} (${(currentQuestion?.options[i] ?? '').replace(/^[A-Z][\.\)]\s*/i, '')})`).join(', ')
            : `Phương án ${getLabel(currentQuestion.correct_answer)} (${(currentQuestion.options[currentQuestion.correct_answer] ?? '').replace(/^[A-Z][\.\)]\s*/i, '')})`

          replyText = `**KHÔNG!** Trong ngân hàng đề ${courseStr}, không có câu hỏi nào khác sử dụng **"${targetOptionText || 'phương án này'}"** làm đáp án đúng.\n\n*(Ở câu hỏi hiện tại, đáp án đúng là **${currentCorrectStr}**).*`
        }

        result = {
          content: {
            reply: replyText,
            formulaExplanation: null,
            similarQuestionFound: hasSimilar,
            similarQuestionDetails: hasSimilar ? similarQuestions[0].text : null,
          },
        }
      }

      return NextResponse.json({
        ok: true,
        data: result.content,
      })
    } catch (err) {
      console.error('POST /api/v1/ai/quiz-assistant error:', err)
      const errMsg = err instanceof Error ? err.message : 'Internal server error'
      return NextResponse.json({ error: errMsg }, { status: 500 })
    }
  },
  { roles: ['dev'] }
)
