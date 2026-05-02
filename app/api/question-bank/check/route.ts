import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { checkQuestionsInBank } from '@/lib/question-bank-manager'
import { z } from 'zod'

const CheckQuestionsSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  questions: z.array(z.object({
    text: z.string().min(1),
    options: z.array(z.string()).min(2),
    correct_answer: z.array(z.number().int().min(0)),
    explanation: z.string().optional(),
    image_url: z.string().optional(),
  })).min(1)
})

/**
 * POST /api/question-bank/check
 * Kiểm tra danh sách câu hỏi có tồn tại trong ngân hàng không
 * Trả về conflicts nếu có
 */
export async function POST(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = CheckQuestionsSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: parsed.error.issues 
      }, { status: 400 })
    }

    const { category_id, questions } = parsed.data

    await connectDB()

    // Kiểm tra tất cả câu hỏi
    const conflicts = await checkQuestionsInBank(category_id, questions)

    // Phân loại conflicts
    const sameAnswerConflicts: any[] = []
    const differentAnswerConflicts: any[] = []

    conflicts.forEach((conflict, index) => {
      const conflictData = {
        questionIndex: index,
        question: questions[index],
        ...conflict
      }

      if (conflict.conflictType === 'same_answer') {
        sameAnswerConflicts.push(conflictData)
      } else if (conflict.conflictType === 'different_answer') {
        differentAnswerConflicts.push(conflictData)
      }
    })

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
}
