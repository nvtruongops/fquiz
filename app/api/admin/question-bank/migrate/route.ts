import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/modules/auth/auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { generateQuestionId } from '@/lib/modules/quiz/question-id-generator'

/**
 * POST /api/admin/question-bank/migrate
 * Cập nhật question_id cho tất cả câu hỏi cũ
 */
export async function POST(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const quizzes = await Quiz.find({ 
      is_temp: { $ne: true },
      is_saved_from_explore: { $ne: true }
    })
    
    let totalUpdated = 0
    let quizUpdated = 0

    for (const quiz of quizzes) {
      if (!quiz.questions || quiz.questions.length === 0) continue
      
      let hasChanges = false
      quiz.questions.forEach((q: any) => {
        if (!q.question_id && q.text && q.options) {
          q.question_id = generateQuestionId({
            text: q.text,
            options: q.options,
            correct_answer: q.correct_answer || []
          })
          hasChanges = true
          totalUpdated++
        }
      })

      if (hasChanges) {
        await quiz.save()
        quizUpdated++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật ${totalUpdated} câu hỏi trong ${quizUpdated} bộ đề.`,
      totalUpdated,
      quizUpdated
    })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
