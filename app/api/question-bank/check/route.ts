import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { validationErrorResponse } from '@/lib/core/api-helpers'
import { checkQuestionsInBank } from '@/lib/modules/quiz/question-bank-manager'
import { generateQuestionId, getAnswerTexts } from '@/lib/modules/quiz/question-id-generator'
import { CheckQuestionsSchema } from '@/lib/modules/quiz/schemas/quiz'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'


/**
 * POST /api/question-bank/check
 * Kiểm tra danh sách câu hỏi có tồn tại trong ngân hàng không
 * Trả về conflicts nếu có
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

    // Kiểm tra tất cả câu hỏi
    const conflicts = await checkQuestionsInBank(category_id, questions)

    // Phân loại conflicts + gom nhóm variants cho từng conflict
    const categoryObjectId = new mongoose.Types.ObjectId(category_id)
    const conflictQuestionIds = new Map<number, string>()

    conflicts.forEach((_conflict, index) => {
      conflictQuestionIds.set(index, generateQuestionId(questions[index]))
    })

    const answerVariantsByQuestionId = await buildAnswerVariants(categoryObjectId, conflictQuestionIds, questions)
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
        ? ` Phát hiện ${differentAnswerConflicts.length} câu hỏi có mâu thuẫn đáp án!`
        : sameAnswerConflicts.length > 0
          ? `✅ ${sameAnswerConflicts.length} câu hỏi đã tồn tại trong ngân hàng (có thể tái sử dụng)`
          : '✅ Tất cả câu hỏi đều mới'
    })
  } catch (error: any) {
    console.error('Error checking question bank:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['admin', 'student'] })

async function buildAnswerVariants(
  categoryObjectId: mongoose.Types.ObjectId,
  conflictQuestionIds: Map<number, string>,
  questions: any[]
) {
  const quizzes = await Quiz.find({
    category_id: categoryObjectId,
    is_temp: { $ne: true },
    is_saved_from_explore: { $ne: true },
  })
    .select('course_code questions')
    .lean()

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
    const qid = conflictQuestionIds.get(index) || ''
    const answerVariants = answerVariantsByQuestionId.get(qid) || []

    const conflictData = {
      questionIndex: index,
      question: questions[index],
      ...conflict,
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