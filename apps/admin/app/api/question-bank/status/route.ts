import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { Quiz } from '@/lib/models/Quiz'
import { QuestionBank } from '@/lib/models/QuestionBank'
import { Category } from '@/lib/models/Category'

export const GET = withAuth(async () => {
  try {
    await connectDB()

    const categories = await Category.find({ type: 'public', status: 'approved' })
      .select('_id name')
      .lean()

    const result = []

    for (const category of categories) {
      const categoryId = String(category._id)

      const quizzes = await Quiz.find({
        category_id: categoryId,
        status: 'published',
        is_public: true,
        is_saved_from_explore: { $ne: true },
      })
        .select('_id course_code questions updatedAt')
        .lean()

      if (quizzes.length === 0) continue

      const bankEntries = await QuestionBank.find({ category_id: categoryId })
        .select('used_in_quizzes used_in_quiz_ids')
        .lean()

      const migratedCourseCodes = new Set<string>()
      const migratedQuizIds = new Set<string>()

      bankEntries.forEach((entry: any) => {
        ;(entry.used_in_quizzes || []).forEach((code: string) => migratedCourseCodes.add(code))
        ;(entry.used_in_quiz_ids || []).forEach((id: any) => migratedQuizIds.add(String(id)))
      })

      const notMigratedQuizzes = quizzes.filter((q: any) => {
        const byId = migratedQuizIds.has(String(q._id))
        const byCode = migratedCourseCodes.has(q.course_code)
        return !byId && !byCode
      })

      const totalBankQuestions = bankEntries.length
      const notMigratedCount = notMigratedQuizzes.length
      const totalQuizzes = quizzes.length

      let status: 'not_migrated' | 'partial' | 'synced' = 'synced'
      if (totalBankQuestions === 0) {
        status = 'not_migrated'
      } else if (notMigratedCount > 0) {
        status = 'partial'
      }

      result.push({
        category_id: categoryId,
        category_name: category.name,
        status,
        total_quizzes: totalQuizzes,
        total_bank_questions: totalBankQuestions,
        not_migrated_quizzes_count: notMigratedCount,
        not_migrated_quiz_codes: notMigratedQuizzes.map((q: any) => q.course_code),
        migrated_quiz_codes: Array.from(migratedCourseCodes),
      })
    }

    const notMigratedTotal = result.filter(r => r.status === 'not_migrated').length
    const partialTotal = result.filter(r => r.status === 'partial').length
    const syncedTotal = result.filter(r => r.status === 'synced').length

    return NextResponse.json({
      total_categories: result.length,
      not_migrated: notMigratedTotal,
      partial: partialTotal,
      synced: syncedTotal,
      categories: result,
    })
  } catch (error) {
    console.error('Error fetching question bank status:', error)
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
  }
})
