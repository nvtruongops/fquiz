import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { syncQuizToQuestionBank } from '@/lib/modules/quiz/question-bank-manager'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import {
  COURSE_CODE_ALLOWED_MESSAGE,
  COURSE_CODE_MAX_LENGTH,
  COURSE_CODE_PATTERN,
} from '@/lib/modules/quiz/schemas/quiz'
import { z } from 'zod'

const SyncQuizSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  course_code: z.string().trim().min(1).max(COURSE_CODE_MAX_LENGTH).regex(COURSE_CODE_PATTERN, COURSE_CODE_ALLOWED_MESSAGE),
  quiz_id: z.string().optional(),
  questions: z.array(z.object({
    text: z.string().min(1),
    options: z.array(z.string()).min(2),
    correct_answer: z.array(z.number().int().min(0)),
    explanation: z.string().optional(),
    image_url: z.string().optional(),
  })).min(1)
})

/**
 * POST /api/question-bank/sync
 * Đồng bộ câu hỏi của quiz vào ngân hàng môn học
 * Tự động bỏ qua câu hỏi có mâu thuẫn đáp án
 */
export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    const payload = await verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = SyncQuizSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: parsed.error.issues 
      }, { status: 400 })
    }

    const { category_id, course_code, quiz_id, questions } = parsed.data

    await connectDB()

    // Tìm quiz_id nếu không được cung cấp
    let resolvedQuizId = quiz_id
    if (!resolvedQuizId) {
      const quiz = await Quiz.findOne({ course_code, category_id })
        .select('_id')
        .lean()
      if (quiz) {
        resolvedQuizId = String(quiz._id)
      }
    }

    // Đồng bộ vào ngân hàng
    const result = await syncQuizToQuestionBank(
      category_id,
      course_code,
      questions,
      payload.userId,
      resolvedQuizId
    )

    return NextResponse.json({
      success: true,
      synced: result.synced,
      new_questions: result.new,
      existing_questions: result.existing,
      conflicts: result.conflicts.length,
      conflict_details: result.conflicts,
      message: result.conflicts.length > 0
        ? ` Đã đồng bộ ${result.synced}/${questions.length} câu hỏi. ${result.conflicts.length} câu bị bỏ qua do mâu thuẫn đáp án.`
        : `✅ Đã đồng bộ thành công ${result.synced} câu hỏi vào ngân hàng môn học.`
    })
  } catch (error: any) {
    console.error('Error syncing to question bank:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })