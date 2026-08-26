import mongoose from 'mongoose'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession' // ponytail: allow-cross-module
import { Quiz } from '@/lib/modules/quiz/models/Quiz' // ponytail: allow-cross-module
import { Question } from '@/lib/modules/quiz/models/Question' // ponytail: allow-cross-module
import { SubjectResolver } from './subject-resolver'
import type { InternalQuizContext, InternalQuizQuestion } from './context-types'
import type { QuizAssistantRequest } from '../schemas/quiz-assistant.schema'

export interface ResolveContextParams extends QuizAssistantRequest {
  authenticatedUserId: string // 🛡️ Invariant 1: Authoritative JWT identity only
}

export class QuizContextResolver {
  static async resolve(params: ResolveContextParams): Promise<InternalQuizContext> {
    const {
      sessionId,
      questionIndex,
      userQuery,
      authenticatedUserId,
      questionText,
      options,
      correctAnswer,
      explanation,
    } = params

    // 1. Fetch Session from DB
    const session = (await QuizSession.findById(sessionId).lean()) as any
    if (!session) {
      const notFoundErr = new Error('Không tìm thấy phiên làm bài')
      ;(notFoundErr as any).status = 404
      throw notFoundErr
    }

    // 2. Invariant 1: Strict Ownership Check with authoritative JWT identity
    const sessionStudentId = session.student_id?.toString()
    if (sessionStudentId !== authenticatedUserId) {
      const forbiddenErr = new Error('Forbidden')
      ;(forbiddenErr as any).status = 403
      throw forbiddenErr
    }

    // 3. Resolve Quiz Document & Course Code / Category
    const quizRes = Quiz.findById(session.quiz_id) as any
    const quizDoc = quizRes && typeof quizRes.select === 'function'
      ? (await quizRes.select('course_code category_id questions question_refs').lean()) as any
      : (await Quiz.findById(session.quiz_id).lean()) as any

    // 3. Resolve Authoritative Subject Context via SubjectResolver (SSOT)
    const subjectContext = await SubjectResolver.resolve(quizDoc || {})
    const courseCode = subjectContext.canonicalCourseCode
    const categoryId = subjectContext.categoryId || undefined

    // 4. Invariant 2: Question Mapping Single Source of Truth (session.question_order)
    const questionOrder = Array.isArray(session.question_order) ? session.question_order : []
    const actualIndex = typeof questionOrder[questionIndex] === 'number'
      ? questionOrder[questionIndex]
      : questionIndex

    let resolvedQuestion: InternalQuizQuestion | null = null

    // Resolution priority chain (Server-Side Authoritative DB SSOT):
    // 1. Session question cache at actualIndex (Single Source of Truth)
    if (Array.isArray(session.questions_cache) && session.questions_cache[actualIndex]) {
      const cachedQ = session.questions_cache[actualIndex]
      resolvedQuestion = {
        id: cachedQ._id?.toString() || new mongoose.Types.ObjectId().toString(),
        text: cachedQ.text,
        options: cachedQ.options || [],
        correctAnswer: cachedQ.correct_answer ?? 0,
        explanation: cachedQ.explanation,
      }
    }
    // 2. Quiz embedded questions at actualIndex
    else if (quizDoc && Array.isArray(quizDoc.questions) && quizDoc.questions[actualIndex]) {
      const embeddedQ = quizDoc.questions[actualIndex]
      resolvedQuestion = {
        id: embeddedQ._id?.toString() || new mongoose.Types.ObjectId().toString(),
        text: embeddedQ.text,
        options: embeddedQ.options || [],
        correctAnswer: embeddedQ.correct_answer ?? 0,
        explanation: embeddedQ.explanation,
      }
    }
    // 3. Quiz question references at actualIndex (Standalone Question collection)
    else if (quizDoc && Array.isArray(quizDoc.question_refs) && quizDoc.question_refs[actualIndex]) {
      const standaloneQ = (await Question.findById(quizDoc.question_refs[actualIndex]).lean()) as any
      if (standaloneQ) {
        resolvedQuestion = {
          id: standaloneQ._id.toString(),
          text: standaloneQ.text,
          options: standaloneQ.options || [],
          correctAnswer: standaloneQ.correct_answer ?? 0,
          explanation: standaloneQ.explanation,
        }
      }
    }
    // 4. Fallback: Direct client-provided question (Only if server DB has no cache and no embedded quiz questions)
    else if (questionText && Array.isArray(options) && options.length > 0) {
      resolvedQuestion = {
        id: new mongoose.Types.ObjectId().toString(),
        text: questionText,
        options,
        correctAnswer: correctAnswer ?? 0,
        explanation: explanation ?? undefined,
      }
    }

    if (!resolvedQuestion) {
      const badReqErr = new Error('Không tìm thấy thông tin câu hỏi')
      ;(badReqErr as any).status = 400
      throw badReqErr
    }

    // 5. Resolve user's submitted answer if any
    const userAnswers = Array.isArray(session.user_answers) ? session.user_answers : []
    const submitted = userAnswers.find((a: any) => a.question_index === questionIndex)
    const userSubmittedAnswer = submitted
      ? (Array.isArray(submitted.answer_indexes) && submitted.answer_indexes.length > 0
          ? submitted.answer_indexes
          : submitted.answer_index)
      : null

    // 6. Target Option Detection (e.g. A, B, C, D)
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
    if (targetOptionIndex !== null && resolvedQuestion.options[targetOptionIndex]) {
      targetOptionText = resolvedQuestion.options[targetOptionIndex].replace(/^[A-Z][\.\)]\s*/i, '').trim()
    } else if (userSubmittedAnswer !== null && userSubmittedAnswer !== undefined) {
      const subIdx = Array.isArray(userSubmittedAnswer) ? userSubmittedAnswer[0] : userSubmittedAnswer
      if (subIdx !== undefined && resolvedQuestion.options[subIdx]) {
        targetOptionLetter = String.fromCharCode(65 + subIdx)
        targetOptionText = resolvedQuestion.options[subIdx].replace(/^[A-Z][\.\)]\s*/i, '').trim()
      }
    }

    return {
      userId: authenticatedUserId,
      sessionId,
      courseCode,
      categoryId,
      subjectContext,
      currentQuestionIndex: questionIndex,
      actualQuestionIndex: actualIndex,
      question: resolvedQuestion,
      userSubmittedAnswer,
      targetOptionIndex,
      targetOptionLetter,
      targetOptionText,
    }
  }
}
