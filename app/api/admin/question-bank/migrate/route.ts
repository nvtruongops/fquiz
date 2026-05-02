import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Quiz } from '@/models/Quiz'
import { QuestionBank } from '@/models/QuestionBank'
import { generateQuestionId, getAnswerTexts } from '@/lib/question-id-generator'
import { z } from 'zod'

const MigrateSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  mode: z.enum(['scan', 'migrate']).default('scan'),
  resolve_conflicts: z.enum(['skip', 'keep_first', 'keep_most_used', 'manual']).optional(),
})

interface ConflictGroup {
  question_id: string
  text: string
  variants: Array<{
    quiz_id: string
    course_code: string
    question_index: number
    options: string[]
    correct_answer: number[]
    explanation?: string
    image_url?: string
  }>
}

/**
 * POST /api/admin/question-bank/migrate
 * Quét và migrate câu hỏi từ các quiz hiện có vào ngân hàng
 */
export async function POST(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload) {
      console.error('[Migration] No payload - unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('[Migration] User role:', payload.role, 'User ID:', payload.userId)
    
    if (payload.role !== 'admin') {
      console.error('[Migration] Access denied - user role is:', payload.role)
      return NextResponse.json({ 
        error: 'Forbidden', 
        message: 'Admin access required',
        userRole: payload.role 
      }, { status: 403 })
    }

    const body = await req.json()
    const parsed = MigrateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parsed.error.issues,
      }, { status: 400 })
    }

    const { category_id, mode, resolve_conflicts } = parsed.data

    await connectDB()

    // 1. Lấy tất cả quiz trong môn học
    const quizzes = await Quiz.find({
      category_id,
      status: 'published',
      is_saved_from_explore: { $ne: true },
    })
      .select('_id course_code questions')
      .lean()

    if (quizzes.length === 0) {
      return NextResponse.json({
        message: 'Không có quiz nào trong môn học này',
        total_quizzes: 0,
        total_questions: 0,
      })
    }

    // 2. Thu thập tất cả câu hỏi và group theo question_id
    const questionMap = new Map<string, ConflictGroup>()
    let totalQuestions = 0

    for (const quiz of quizzes) {
      if (!Array.isArray(quiz.questions)) continue

      quiz.questions.forEach((q: any, index: number) => {
        if (!q.text || !Array.isArray(q.options) || q.options.length < 2) return

        totalQuestions++

        const questionId = generateQuestionId({
          text: q.text,
          options: q.options,
          correct_answer: q.correct_answer || [],
        })

        if (!questionMap.has(questionId)) {
          questionMap.set(questionId, {
            question_id: questionId,
            text: q.text,
            variants: [],
          })
        }

        questionMap.get(questionId)!.variants.push({
          quiz_id: String(quiz._id),
          course_code: quiz.course_code,
          question_index: index,
          options: q.options,
          correct_answer: q.correct_answer || [],
          explanation: q.explanation,
          image_url: q.image_url,
        })
      })
    }

    // 3. Phân tích conflicts - so sánh theo ANSWER TEXTS (không phải indices)
    const conflicts: ConflictGroup[] = []
    const uniqueQuestions: ConflictGroup[] = []

    questionMap.forEach((group) => {
      // So sánh đáp án theo TEXT để tránh false conflict khi options đổi thứ tự
      const uniqueAnswerTexts = new Set(
        group.variants.map((v) => 
          JSON.stringify(getAnswerTexts(v.options, v.correct_answer))
        )
      )

      if (uniqueAnswerTexts.size > 1) {
        conflicts.push(group)
      } else {
        uniqueQuestions.push(group)
      }
    })

    // 4. SCAN MODE - Chỉ trả về thông tin
    if (mode === 'scan') {
      return NextResponse.json({
        mode: 'scan',
        total_quizzes: quizzes.length,
        total_questions: totalQuestions,
        unique_questions: uniqueQuestions.length,
        conflicts: conflicts.length,
        conflict_details: conflicts.map((c) => ({
          question_id: c.question_id,
          text: c.text,
          variant_count: c.variants.length,
          variants: c.variants.map((v) => ({
            course_code: v.course_code,
            correct_answer: v.correct_answer,
            options: v.options,
          })),
        })),
        summary: {
          can_migrate_immediately: uniqueQuestions.length,
          need_manual_review: conflicts.length,
        },
      })
    }

    // 5. MIGRATE MODE - Thực hiện migration
    let migratedCount = 0
    let skippedCount = 0
    const migrationErrors: string[] = []

    // Migrate unique questions (không có conflict)
    for (const group of uniqueQuestions) {
      try {
        const firstVariant = group.variants[0]
        const usedInQuizzes = [...new Set(group.variants.map((v) => v.course_code))]

        await QuestionBank.findOneAndUpdate(
          {
            category_id,
            question_id: group.question_id,
          },
          {
            $setOnInsert: {
              category_id,
              question_id: group.question_id,
              text: group.text,
              options: firstVariant.options,
              correct_answer: firstVariant.correct_answer,
              explanation: firstVariant.explanation,
              image_url: firstVariant.image_url,
              created_by: payload.userId,
            },
            $set: {
              usage_count: usedInQuizzes.length,
              used_in_quizzes: usedInQuizzes,
            },
          },
          { upsert: true }
        )

        migratedCount++
      } catch (error) {
        migrationErrors.push(`Failed to migrate question: ${group.text.substring(0, 50)}`)
      }
    }

    // Xử lý conflicts theo strategy
    if (resolve_conflicts && resolve_conflicts !== 'manual') {
      for (const group of conflicts) {
        try {
          let selectedVariant = group.variants[0]

          if (resolve_conflicts === 'keep_most_used') {
            // Chọn variant xuất hiện nhiều nhất (so sánh theo answer texts)
            const answerCounts = new Map<string, number>()
            group.variants.forEach((v) => {
              const key = JSON.stringify(getAnswerTexts(v.options, v.correct_answer))
              answerCounts.set(key, (answerCounts.get(key) || 0) + 1)
            })

            const mostCommonAnswerKey = Array.from(answerCounts.entries())
              .sort((a, b) => b[1] - a[1])[0][0]

            selectedVariant =
              group.variants.find(
                (v) => JSON.stringify(getAnswerTexts(v.options, v.correct_answer)) === mostCommonAnswerKey
              ) || group.variants[0]
          }
          // keep_first: Giữ variant đầu tiên (default)

          const usedInQuizzes = [...new Set(group.variants.map((v) => v.course_code))]

          await QuestionBank.findOneAndUpdate(
            {
              category_id,
              question_id: group.question_id,
            },
            {
              $setOnInsert: {
                category_id,
                question_id: group.question_id,
                text: group.text,
                options: selectedVariant.options,
                correct_answer: selectedVariant.correct_answer,
                explanation: selectedVariant.explanation,
                image_url: selectedVariant.image_url,
                created_by: payload.userId,
              },
              $set: {
                usage_count: usedInQuizzes.length,
                used_in_quizzes: usedInQuizzes,
                has_conflicts: true,
                conflict_notes: `Có ${group.variants.length} variants với đáp án khác nhau. Strategy: ${resolve_conflicts}`,
              },
            },
            { upsert: true }
          )

          migratedCount++
        } catch (error) {
          migrationErrors.push(`Failed to migrate conflict: ${group.text.substring(0, 50)}`)
        }
      }
    } else {
      skippedCount = conflicts.length
    }

    return NextResponse.json({
      mode: 'migrate',
      success: true,
      total_quizzes: quizzes.length,
      total_questions: totalQuestions,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: migrationErrors.length,
      error_details: migrationErrors,
      summary: resolve_conflicts === 'manual'
        ? `Đã migrate ${migratedCount} câu hỏi. ${skippedCount} câu có conflict cần xử lý thủ công.`
        : `Đã migrate ${migratedCount} câu hỏi thành công.`,
    })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
