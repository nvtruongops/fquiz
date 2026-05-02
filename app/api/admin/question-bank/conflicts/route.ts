import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Quiz } from '@/models/Quiz'
import { QuestionBank } from '@/models/QuestionBank'
import { generateQuestionId, getAnswerTexts } from '@/lib/question-id-generator'
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
    question_index: z.number(),
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
export async function GET(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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

    // Lấy tất cả quiz trong môn học
    const quizzes = await Quiz.find({
      category_id,
      status: 'published',
      is_saved_from_explore: { $ne: true },
    })
      .select('_id course_code questions')
      .lean()

    // Group câu hỏi theo question_id
    const questionMap = new Map<
      string,
      {
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
    >()

    for (const quiz of quizzes) {
      if (!Array.isArray(quiz.questions)) continue

      quiz.questions.forEach((q: any, index: number) => {
        if (!q.text || !Array.isArray(q.options) || q.options.length < 2) return

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

    // Lọc chỉ những câu có conflict (đáp án khác nhau theo TEXT)
    const conflicts: any[] = []

    questionMap.forEach((group) => {
      // So sánh theo answer TEXTS để tránh false conflict khi options đổi thứ tự
      const uniqueAnswerTexts = new Set(
        group.variants.map((v) => JSON.stringify(getAnswerTexts(v.options, v.correct_answer)))
      )

      if (uniqueAnswerTexts.size > 1) {
        // Group variants theo answer texts
        const answerGroups = new Map<string, typeof group.variants>()

        group.variants.forEach((variant) => {
          const answerKey = JSON.stringify(getAnswerTexts(variant.options, variant.correct_answer))
          if (!answerGroups.has(answerKey)) {
            answerGroups.set(answerKey, [])
          }
          answerGroups.get(answerKey)!.push(variant)
        })

        conflicts.push({
          question_id: group.question_id,
          text: group.text,
          total_variants: group.variants.length,
          answer_groups: Array.from(answerGroups.entries()).map(([answerKey, variants]) => ({
            correct_answer: variants[0].correct_answer, // Giữ indices gốc để hiển thị
            answer_texts: JSON.parse(answerKey),        // Thêm texts để dễ đọc
            count: variants.length,
            quizzes: variants.map((v) => v.course_code),
            sample_variant: variants[0],
          })),
        })
      }
    })

    // Sort by số lượng variants (nhiều nhất trước)
    conflicts.sort((a, b) => b.total_variants - a.total_variants)

    return NextResponse.json({
      total_conflicts: conflicts.length,
      conflicts,
    })
  } catch (error: any) {
    console.error('Error fetching conflicts:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/question-bank/conflicts
 * Giải quyết conflict bằng cách chọn 1 variant làm chuẩn
 */
export async function POST(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
      // Tìm tất cả quiz trong môn học
      const quizzes = await Quiz.find({ category_id, status: 'published' })

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
}
