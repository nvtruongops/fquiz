import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { verifyToken } from '@/lib/modules/auth/auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import { generateQuestionId, areAnswersSame } from '@/lib/modules/quiz/question-id-generator'
import { z } from 'zod'

const ScanSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  mode: z.literal('scan'),
})

const MigrateSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  mode: z.literal('migrate'),
  resolve_conflicts: z.enum(['skip', 'keep_first', 'keep_most_used']).default('skip'),
})

const CleanupSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  mode: z.literal('cleanup'),
})

/**
 * POST /api/admin/question-bank/migrate
 * mode=scan:   Quét câu hỏi trong môn học, thống kê conflicts
 * mode=migrate: Migrate câu hỏi vào QuestionBank
 */
export async function POST(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()
    const { mode } = body

    if (mode === 'scan') {
      const parsed = ScanSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
      }

      const { category_id } = parsed.data
      const categoryObjectId = new mongoose.Types.ObjectId(category_id)

      const quizzes = await Quiz.find({
        category_id: categoryObjectId,
        is_temp: { $ne: true },
        is_saved_from_explore: { $ne: true },
      }).lean()

      let totalQuestions = 0
      const questionMap = new Map<string, {
        text: string
        variants: Array<{
          course_code: string
          correct_answer: number[]
          options: string[]
        }>
      }>()

      for (const quiz of quizzes) {
        if (!Array.isArray(quiz.questions)) continue
        for (const q of quiz.questions as any[]) {
          if (!q.text || !Array.isArray(q.options) || q.options.length === 0) continue

          totalQuestions++
          const qid = q.question_id || generateQuestionId({ text: q.text, options: q.options })

          if (!questionMap.has(qid)) {
            questionMap.set(qid, { text: q.text, variants: [] })
          }
          const entry = questionMap.get(qid)!
          const exists = entry.variants.some(
            v => v.course_code === quiz.course_code &&
                 areAnswersSame(
                   { options: v.options, correct_answer: v.correct_answer },
                   { options: q.options, correct_answer: q.correct_answer }
                 )
          )
          if (!exists) {
            entry.variants.push({
              course_code: quiz.course_code,
              correct_answer: q.correct_answer || [],
              options: q.options,
            })
          }
        }
      }

      const conflictDetails: Array<{
        question_id: string
        text: string
        variant_count: number
        variants: Array<{
          course_code: string
          correct_answer: number[]
          options: string[]
        }>
      }> = []

      let conflicts = 0
      for (const [qid, entry] of questionMap) {
        const answerGroups = new Map<string, typeof entry.variants[0][]>()

        for (const v of entry.variants) {
          const answerTexts = v.correct_answer
            .map((i: number) => v.options[i]?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '')
            .filter(Boolean)
            .sort()
            .join('||')
          if (!answerGroups.has(answerTexts)) {
            answerGroups.set(answerTexts, [])
          }
          answerGroups.get(answerTexts)!.push(v)
        }

        if (answerGroups.size > 1) {
          conflicts++
          conflictDetails.push({
            question_id: qid,
            text: entry.text,
            variant_count: entry.variants.length,
            variants: entry.variants,
          })
        }
      }

      return NextResponse.json({
        total_quizzes: quizzes.length,
        total_questions: totalQuestions,
        unique_questions: questionMap.size,
        conflicts,
        conflict_details: conflictDetails,
      })
    }

    if (mode === 'migrate') {
      const parsed = MigrateSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
      }

      const { category_id, resolve_conflicts } = parsed.data
      const categoryObjectId = new mongoose.Types.ObjectId(category_id)

      const quizzes = await Quiz.find({
        category_id: categoryObjectId,
        is_temp: { $ne: true },
        is_saved_from_explore: { $ne: true },
      }).lean()

      let newQuestions = 0
      let existingQuestions = 0
      let skippedConflicts = 0
      const createdBy = new mongoose.Types.ObjectId(payload.userId)
      const now = new Date()

      for (const quiz of quizzes) {
        if (!Array.isArray(quiz.questions)) continue
        for (const q of quiz.questions as any[]) {
          if (!q.text || !Array.isArray(q.options) || q.options.length === 0) continue

          const qid = q.question_id || generateQuestionId({ text: q.text, options: q.options })

          const existing = await QuestionBank.findOne({
            category_id: categoryObjectId,
            question_id: qid,
          })

          if (existing) {
            const sameAnswer = areAnswersSame(
              { options: q.options, correct_answer: q.correct_answer || [] },
              { options: existing.options, correct_answer: existing.correct_answer }
            )

            if (!sameAnswer && resolve_conflicts === 'skip') {
              skippedConflicts++
              continue
            }

            const quizIdStr = String(quiz._id)
            const alreadyTrackedById = (existing.used_in_quiz_ids || []).some((id: any) => String(id) === quizIdStr)

            if (!alreadyTrackedById) {
              if (!existing.used_in_quizzes.includes(quiz.course_code)) {
                existing.used_in_quizzes.push(quiz.course_code)
              }
              existing.used_in_quiz_ids.push(quiz._id)
              existing.usage_count = existing.used_in_quiz_ids.length
            }

            if (!sameAnswer) {
              if (resolve_conflicts === 'keep_first') {
                // keep existing - do nothing
              } else if (resolve_conflicts === 'keep_most_used') {
                const currentVariantCount = existing.usage_count
                const incomingVariants = quizzes.filter(qz =>
                  qz.questions?.some((qq: any) => {
                    const qqid = qq.question_id || generateQuestionId({ text: qq.text, options: qq.options })
                    return qqid === qid
                  })
                ).length
                if (incomingVariants > currentVariantCount) {
                  existing.correct_answer = q.correct_answer || []
                  existing.options = q.options
                  existing.explanation = q.explanation || existing.explanation
                }
              }
            }

            await existing.save()
            existingQuestions++
          } else {
            await QuestionBank.create({
              category_id: categoryObjectId,
              question_id: qid,
              text: q.text,
              options: q.options,
              correct_answer: q.correct_answer || [],
              explanation: q.explanation,
              image_url: q.image_url,
              created_by: createdBy,
              usage_count: 1,
              used_in_quizzes: [quiz.course_code],
              used_in_quiz_ids: [quiz._id],
              has_conflicts: false,
            })
            newQuestions++
          }
        }
      }

      const summary = `Đã thêm ${newQuestions} câu hỏi mới, cập nhật ${existingQuestions} câu đã có${skippedConflicts > 0 ? `, bỏ qua ${skippedConflicts} conflict` : ''}.`

      return NextResponse.json({
        success: true,
        summary,
        new_questions: newQuestions,
        existing_questions: existingQuestions,
        skipped_conflicts: skippedConflicts,
      })
    }

    if (mode === 'cleanup') {
      const parsed = CleanupSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
      }

      const { category_id } = parsed.data
      const categoryObjectId = new mongoose.Types.ObjectId(category_id)

      // Populate used_in_quiz_ids from used_in_quizzes for existing entries
      const bankEntries = await QuestionBank.find({
        category_id: categoryObjectId,
        $or: [
          { used_in_quiz_ids: { $exists: false } },
          { used_in_quiz_ids: { $size: 0 } },
        ],
      })

      let updatedCount = 0
      for (const entry of bankEntries) {
        const quizIds: mongoose.Types.ObjectId[] = []
        for (const code of entry.used_in_quizzes) {
          const quiz = await Quiz.findOne({ course_code: code, category_id: categoryObjectId })
            .select('_id')
            .lean()
          if (quiz) {
            quizIds.push(quiz._id)
          }
        }
        if (quizIds.length > 0) {
          entry.used_in_quiz_ids = quizIds
          entry.usage_count = quizIds.length
          await entry.save()
          updatedCount++
        }
      }

      return NextResponse.json({
        success: true,
        message: `Đã cập nhật ${updatedCount} câu hỏi với quiz_ids`,
        updated: updatedCount,
      })
    }

    return NextResponse.json({ error: 'Invalid mode. Use "scan", "migrate", or "cleanup".' }, { status: 400 })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
