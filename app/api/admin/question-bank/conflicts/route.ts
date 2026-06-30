import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { verifyToken } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import { generateQuestionId, getAnswerTexts } from '@/lib/modules/quiz/question-id-generator'
import { z } from 'zod'

const GetConflictsSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
})

const ResolveConflictSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  question_id: z.string(),
  question_text: z.string(), // Text câu hỏi để lưu đúng vào Question Bank
  selected_variant: z.object({
    quiz_id: z.string(),
    course_code: z.string(),
    question_index: z.number().optional(),
    options: z.array(z.string()),
    correct_answer: z.array(z.number()),
    explanation: z.string().optional(),
    image_url: z.string().optional(),
  }),
  update_quizzes: z.boolean().default(false),
})

/**
 * GET /api/admin/question-bank/conflicts
 * Lấy danh sách câu hỏi có conflict trong môn học
 */
export const GET = withAuth(async (req: Request, { payload }) => {
  try {
    const { searchParams } = new URL(req.url)
    const parsed = GetConflictsSchema.safeParse({
      category_id: searchParams.get('category_id'),
    })

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parsed.error.issues,
      }, { status: 400 })
    }

    const { category_id } = parsed.data

    await connectDB()

    // PIPELINE TỐI ƯU: Chạy trực tiếp dưới Database
    const pipeline = [
      {
        $match: {
          category_id: new mongoose.Types.ObjectId(category_id),
          status: 'published',
          is_public: true,
          is_temp: { $ne: true },
          is_saved_from_explore: { $ne: true }
        }
      },
      { $unwind: "$questions" },
      // Bỏ qua câu hỏi thiếu question_id → tránh gom lộn xộn vào 1 group
      {
        $match: {
          "questions.question_id": { $nin: [null, ""] }
        }
      },
      {
        $group: {
          _id: "$questions.question_id",
          text: { $first: "$questions.text" },
          total_variants: { $sum: 1 },
          variants: {
            $push: {
              quiz_id: "$_id",
              course_code: "$course_code",
              options: "$questions.options",
              correct_answer: "$questions.correct_answer",
              explanation: "$questions.explanation",
              image_url: "$questions.image_url"
            }
          }
        }
      },
      { $match: { total_variants: { $gt: 1 } } }
    ]

    const results = await Quiz.aggregate(pipeline)

    // Layer 2: Filter out false conflicts (same text answers)
    // and format for UI
    const conflicts = results.map(group => {
      const answerGroups = new Map<string, any>()
      
      group.variants.forEach((v: any) => {
        // Chuẩn hóa answer texts để so sánh
        const answerKey = JSON.stringify(getAnswerTexts(v.options, v.correct_answer))
        if (!answerGroups.has(answerKey)) {
          answerGroups.set(answerKey, {
            correct_answer: v.correct_answer,
            answer_texts: JSON.parse(answerKey),
            count: 0,
            quizzes: [],
            sample_variant: v
          })
        }
        const g = answerGroups.get(answerKey)
        g.count++
        g.quizzes.push(v.course_code)
      })

      // Chỉ coi là conflict nếu có từ 2 nhóm đáp án khác nhau trở lên
      if (answerGroups.size > 1) {
        return {
          question_id: group._id,
          text: group.text,
          total_variants: group.total_variants,
          answer_groups: Array.from(answerGroups.values())
        }
      }
      return null
    }).filter(Boolean)

    // Sort by volume
    conflicts.sort((a: any, b: any) => b.total_variants - a.total_variants)

    return NextResponse.json({
      total_conflicts: conflicts.length,
      conflicts,
    })
  } catch (error: any) {
    console.error('Error fetching conflicts:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['admin'] })

/**
 * POST /api/admin/question-bank/conflicts
 * Giải quyết conflict bằng cách chọn 1 variant làm chuẩn
 */
export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    const body = await req.json()
    const parsed = ResolveConflictSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parsed.error.issues,
      }, { status: 400 })
    }

    const { category_id, question_id, question_text, selected_variant, update_quizzes } = parsed.data

    await connectDB()

    // 1. Lưu vào Question Bank với text đúng
    await QuestionBank.findOneAndUpdate(
      { category_id, question_id },
      {
        $set: {
          category_id,
          question_id,
          text: question_text,                        // ✅ Dùng text câu hỏi thực sự
          options: selected_variant.options,
          correct_answer: selected_variant.correct_answer,
          explanation: selected_variant.explanation,
          image_url: selected_variant.image_url,
          usage_count: 1,
          used_in_quizzes: [selected_variant.course_code],
          has_conflicts: false,
          conflict_notes: `Resolved by admin at ${new Date().toISOString()}`,
          created_by: payload.userId,
        },
      },
      { upsert: true }
    )

    // 2. Nếu update_quizzes = true, cập nhật tất cả quiz có câu hỏi này
    let updatedQuizzes = 0
    if (update_quizzes) {
      // Tìm tất cả quiz trong môn học (bỏ qua temp quiz và quiz private)
      const quizzes = await Quiz.find({
        category_id,
        status: 'published',
        is_public: true,
        is_temp: { $ne: true },
      })

      const normalizedText = question_text.trim().toLowerCase().replace(/\s+/g, ' ')

      for (const quiz of quizzes) {
        if (!Array.isArray(quiz.questions)) continue

        let hasChanges = false

        quiz.questions.forEach((q: any) => {
          if (!q.text || !Array.isArray(q.options)) return

          // ✅ Tìm bằng text (normalize) thay vì question_id
          // Vì Q2 có thể có options khác thứ tự → hash khác → không tìm được
          const qText = q.text.trim().toLowerCase().replace(/\s+/g, ' ')
          if (qText !== normalizedText) return

          // Chỉ update correct_answer và explanation, GIỮ NGUYÊN options của quiz đó
          // Vì options có thể khác thứ tự, cần map đáp án đúng sang index mới
          const selectedAnswerTexts = selected_variant.correct_answer
            .map((idx: number) => selected_variant.options[idx]?.trim().toLowerCase().replace(/\s+/g, ' '))
            .filter(Boolean)

          // Tìm indices tương ứng trong options của quiz này
          const newCorrectAnswer = q.options
            .map((opt: string, idx: number) => {
              const optNorm = opt.trim().toLowerCase().replace(/\s+/g, ' ')
              return selectedAnswerTexts.includes(optNorm) ? idx : -1
            })
            .filter((idx: number) => idx !== -1)

          if (newCorrectAnswer.length > 0) {
            q.correct_answer = newCorrectAnswer
            if (selected_variant.explanation) {
              q.explanation = selected_variant.explanation
            }
            hasChanges = true
          }
        })

        if (hasChanges) {
          await quiz.save()
          updatedQuizzes++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: update_quizzes
        ? `Đã resolve conflict và cập nhật ${updatedQuizzes} quiz`
        : 'Đã resolve conflict và lưu vào ngân hàng',
      updated_quizzes: updatedQuizzes,
    })
  } catch (error: any) {
    console.error('Error resolving conflict:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['admin'] })