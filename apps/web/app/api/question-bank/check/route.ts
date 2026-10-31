import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { validationErrorResponse } from '@/lib/core/api-helpers'
import { checkQuestionsInBank } from '@/lib/modules/quiz/question-bank-manager'
import { generateQuestionId, getAnswerTexts } from '@/lib/modules/quiz/question-id-generator'
import { CheckQuestionsSchema } from '@/lib/modules/quiz/schemas/quiz'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { getPublicQuizFilter } from '@/lib/modules/quiz/utils/public-quiz-filter'


/**
 * POST /api/question-bank/check
 * Check if question list exists in question bank
 * Returns conflicts if found
 */
export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    const body = await req.json()
    const parsed = CheckQuestionsSchema.safeParse(body)

    if (!parsed.success) {
      return validationErrorResponse(parsed.error)
    }

    const { category_id, questions } = parsed.data

    await connectDB()

    const accessibleQuizFilter: Record<string, unknown> = {
      category_id: new mongoose.Types.ObjectId(category_id),
      is_temp: { $ne: true },
      status: { $ne: 'deleted' },
    }
    if (payload.role !== 'admin' && payload.role !== 'dev') {
      accessibleQuizFilter.$or = [
        getPublicQuizFilter(),
        { created_by: new mongoose.Types.ObjectId(payload.userId) },
      ]
    }
    const accessibleQuizzes = await Quiz.find(accessibleQuizFilter)
      .select('_id course_code questions')
      .lean() as any[]
    const accessibleQuizIds = accessibleQuizzes.map((quiz) => quiz._id)

    // Restrict both bank records and answer variants to quizzes visible to this user.
    const conflicts = await checkQuestionsInBank(category_id, questions, accessibleQuizIds)

    // Classify conflicts and group variants for each conflict
    const categoryObjectId = new mongoose.Types.ObjectId(category_id)
    const conflictQuestionIds = new Map<number, string>()

    conflicts.forEach((_conflict, index) => {
      const question = questions.at(index)
      if (question) conflictQuestionIds.set(index, generateQuestionId(question))
    })

    const answerVariantsByQuestionId = buildAnswerVariants(accessibleQuizzes, conflictQuestionIds, questions)
    const { sameAnswerConflicts, differentAnswerConflicts } = classifyConflicts(conflicts, questions, conflictQuestionIds, answerVariantsByQuestionId)

    return NextResponse.json({
      total_questions: questions.length,
      conflicts_found: conflicts.size,
      same_answer_conflicts: sameAnswerConflicts.length,
      different_answer_conflicts: differentAnswerConflicts.length,
      conflicts: {
        same_answer: sameAnswerConflicts,
        different_answer: differentAnswerConflicts
      },
      summary: differentAnswerConflicts.length > 0
        ? `⚠️ Detected ${differentAnswerConflicts.length} questions with conflicting answers!`
        : sameAnswerConflicts.length > 0
          ? `✅ ${sameAnswerConflicts.length} questions already exist in bank (reusable)`
          : '✅ All questions are new'
    })
  } catch (error: any) {
    console.error('Error checking question bank:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['admin', 'student'] })

function buildAnswerVariants(
  quizzes: any[],
  conflictQuestionIds: Map<number, string>,
  questions: any[]
) {
  const answerVariantsByQuestionId = new Map<string, Array<{
    correct_answer: number[]
    answer_texts: string[]
    count: number
    quizzes: string[]
    options: string[]
  }>>()

  for (const quiz of quizzes) {
    if (!Array.isArray(quiz.questions)) continue
    for (const q of quiz.questions as any[]) {
      processQuizQuestionVariant(q, quiz.course_code, conflictQuestionIds, questions, answerVariantsByQuestionId)
    }
  }

  return answerVariantsByQuestionId
}

function processQuizQuestionVariant(
  q: any,
  courseCode: string,
  conflictQuestionIds: Map<number, string>,
  questions: any[],
  answerVariantsByQuestionId: Map<string, any[]>
) {
  if (!q.text || !Array.isArray(q.options)) return
  const qText = q.text.trim().toLowerCase().replace(/\s+/g, ' ')
  const qInput = questions.find(qi => qi.text.trim().toLowerCase().replace(/\s+/g, ' ') === qText)
  if (!qInput) return

  const qid = generateQuestionId({ text: q.text, options: q.options })
  let matchesConflict = false
  for (const [, conflictQid] of conflictQuestionIds) {
    if (conflictQid === qid) { matchesConflict = true; break }
  }
  if (!matchesConflict) return

  const answerTexts = getAnswerTexts(q.options, q.correct_answer || [])
  if (!answerVariantsByQuestionId.has(qid)) {
    answerVariantsByQuestionId.set(qid, [])
  }
  const variants = answerVariantsByQuestionId.get(qid)!

  const existingVariant = variants.find(v => JSON.stringify(v.answer_texts.sort()) === JSON.stringify([...answerTexts].sort()))
  if (existingVariant) {
    existingVariant.count++
    if (!existingVariant.quizzes.includes(courseCode)) {
      existingVariant.quizzes.push(courseCode)
    }
  } else {
    variants.push({
      correct_answer: q.correct_answer || [],
      answer_texts: answerTexts,
      count: 1,
      quizzes: [courseCode],
      options: q.options,
    })
  }
}

function classifyConflicts(
  conflicts: Map<number, any>,
  questions: any[],
  conflictQuestionIds: Map<number, string>,
  answerVariantsByQuestionId: Map<string, any[]>
) {
  const sameAnswerConflicts: any[] = []
  const differentAnswerConflicts: any[] = []

  conflicts.forEach((conflict, index) => {
    const inputQuestion = questions.at(index)
    if (!inputQuestion) return
    const qid = conflictQuestionIds.get(index) || ''
    const answerVariants = answerVariantsByQuestionId.get(qid) || []
    if (answerVariants.length === 0) return

    const inputAnswerTexts = getAnswerTexts(inputQuestion.options, inputQuestion.correct_answer || [])
      .map((text) => text.trim().toLowerCase())
      .sort()
    const hasSameVisibleAnswer = answerVariants.some((variant) =>
      JSON.stringify([...variant.answer_texts].map((text) => text.trim().toLowerCase()).sort()) === JSON.stringify(inputAnswerTexts)
    )
    const visibleCodes = Array.from(new Set(answerVariants.flatMap((variant) => variant.quizzes)))
    const visibleConflict = {
      ...conflict,
      conflictType: hasSameVisibleAnswer ? 'same_answer' : 'different_answer',
      message: hasSameVisibleAnswer
        ? `Question ${index + 1}: Already exists in a quiz you can access.`
        : `Question ${index + 1}: Answer differs from a quiz you can access.`,
      existingQuestion: {
        ...conflict.existingQuestion,
        _id: undefined,
        question_id: qid,
        text: inputQuestion.text,
        correct_answer: answerVariants[0].correct_answer,
        explanation: undefined,
        options: answerVariants[0].options,
        used_in_quizzes: visibleCodes,
        used_in_quiz_ids: [],
        usage_count: answerVariants.reduce((sum, variant) => sum + variant.count, 0),
      },
    }

    const conflictData = {
      questionIndex: index,
      question: inputQuestion,
      ...visibleConflict,
      answerVariants: answerVariants.length > 0 ? answerVariants : undefined,
    }

    if (conflict.conflictType === 'same_answer') {
      sameAnswerConflicts.push(conflictData)
    } else if (conflict.conflictType === 'different_answer') {
      differentAnswerConflicts.push(conflictData)
    }
  })

  return { sameAnswerConflicts, differentAnswerConflicts }
}
