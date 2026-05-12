import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { verifyToken } from '@/lib/modules/auth/auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { generateQuestionId } from '@/lib/modules/quiz/question-id-generator'

/**
 * POST /api/admin/question-bank/regenerate-ids
 * Super Migration Tool: Tính toán lại toàn bộ mã ID, chuẩn hóa mã môn và đồng bộ số lượng.
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
    
    let stats = {
      totalQuizzes: quizzes.length,
      quizzesUpdated: 0,
      totalQuestionsProcessed: 0,
      idsRegenerated: 0,
      codesNormalized: 0,
      countsFixed: 0
    }

    for (const quiz of quizzes) {
      let hasChanges = false

      // 1. Chuẩn hóa Mã môn (Course Code)
      const oldCode = quiz.course_code || ''
      const newCode = oldCode.trim().toUpperCase()
      if (oldCode !== newCode) {
        quiz.course_code = newCode
        hasChanges = true
        stats.codesNormalized++
      }

      // 2. Tính toán lại toàn bộ Question IDs
      if (quiz.questions && quiz.questions.length > 0) {
        quiz.questions.forEach((q: any) => {
          stats.totalQuestionsProcessed++
          const newId = generateQuestionId({
            text: q.text,
            options: q.options,
            correct_answer: q.correct_answer || []
          })

          if (q.question_id !== newId) {
            q.question_id = newId
            hasChanges = true
            stats.idsRegenerated++
          }
        })

        // 3. Đồng bộ questionCount
        if (quiz.questionCount !== quiz.questions.length) {
          quiz.questionCount = quiz.questions.length
          hasChanges = true
          stats.countsFixed++
        }
      }

      if (hasChanges) {
        quiz.markModified('questions')
        await quiz.save()
        stats.quizzesUpdated++
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Đã hoàn tất tổng vệ sinh dữ liệu hệ thống (Super Migration Tool).',
      details: stats
    })
  } catch (error: any) {
    console.error('Super Migration Tool Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
