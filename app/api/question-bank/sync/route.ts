import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { syncQuizToQuestionBank } from '@/lib/question-bank-manager'
import { z } from 'zod'

const SyncQuizSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  course_code: z.string().min(1).max(50),
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
export async function POST(req: Request) {
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

    const { category_id, course_code, questions } = parsed.data

    await connectDB()

    // Đồng bộ vào ngân hàng
    const result = await syncQuizToQuestionBank(
      category_id,
      course_code,
      questions,
      payload.userId
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
}
