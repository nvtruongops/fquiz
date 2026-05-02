import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Quiz } from '@/models/Quiz'
import { QuestionBank } from '@/models/QuestionBank'
import { Category } from '@/models/Category'

/**
 * GET /api/admin/question-bank/status
 * Kiểm tra trạng thái migration của từng môn học:
 * - Môn chưa có câu hỏi nào trong ngân hàng
 * - Môn đã có nhưng có quiz mới chưa được migration
 */
export async function GET(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // Lấy tất cả môn học public
    const categories = await Category.find({ type: 'public', status: 'approved' })
      .select('_id name')
      .lean()

    const result = []

    for (const category of categories) {
      const categoryId = String(category._id)

      // Lấy tất cả quiz published trong môn này
      const quizzes = await Quiz.find({
        category_id: categoryId,
        status: 'published',
        is_saved_from_explore: { $ne: true },
      })
        .select('_id course_code questions updatedAt')
        .lean()

      if (quizzes.length === 0) continue // Bỏ qua môn không có quiz

      // Lấy danh sách course_codes đã có trong ngân hàng
      const bankEntries = await QuestionBank.find({ category_id: categoryId })
        .select('used_in_quizzes')
        .lean()

      // Tập hợp tất cả course_codes đã được migration
      const migratedCourseCodes = new Set<string>()
      bankEntries.forEach(entry => {
        entry.used_in_quizzes.forEach((code: string) => migratedCourseCodes.add(code))
      })

      const totalQuizzes = quizzes.length
      const totalBankQuestions = bankEntries.length

      // Phân loại từng quiz
      const notMigrated: string[] = []
      const migrated: string[] = []

      quizzes.forEach(quiz => {
        if (migratedCourseCodes.has(quiz.course_code)) {
          migrated.push(quiz.course_code)
        } else {
          notMigrated.push(quiz.course_code)
        }
      })

      // Xác định trạng thái tổng thể của môn
      let status: 'not_migrated' | 'partial' | 'synced'
      if (totalBankQuestions === 0) {
        status = 'not_migrated'
      } else if (notMigrated.length > 0) {
        status = 'partial'
      } else {
        status = 'synced'
      }

      result.push({
        category_id: categoryId,
        category_name: category.name,
        status,
        total_quizzes: totalQuizzes,
        total_bank_questions: totalBankQuestions,
        migrated_quiz_codes: migrated,
        not_migrated_quiz_codes: notMigrated,
      })
    }

    // Sort: not_migrated → partial → synced
    const order = { not_migrated: 0, partial: 1, synced: 2 }
    result.sort((a, b) => order[a.status] - order[b.status])

    return NextResponse.json({
      total_categories: result.length,
      not_migrated: result.filter(r => r.status === 'not_migrated').length,
      partial: result.filter(r => r.status === 'partial').length,
      synced: result.filter(r => r.status === 'synced').length,
      categories: result,
    })
  } catch (error: any) {
    console.error('Error fetching question bank status:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
