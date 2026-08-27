import { connectDB } from '@/lib/core/db/mongodb'
import { User } from '@/lib/modules/auth/models/User' // ponytail: allow-cross-module
import { Category } from '@/lib/modules/quiz/models/Category'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { enqueueMail } from '@/lib/core/mail/mail'
import logger from '@/lib/core/utils/logger'

export async function notifyPinnedUsersNewQuiz(quiz: {
  _id: any
  title: string
  course_code: string
  category_id: any
}) {
  try {
    await connectDB()
    let categoryName = ''
    if (quiz.category_id) {
      const cat = await Category.findById(quiz.category_id).select('name').lean() as { name?: string } | null
      if (cat?.name) categoryName = cat.name
    }

    const matchKeys = Array.from(new Set([
      quiz.category_id?.toString(),
      quiz.course_code,
      quiz.course_code?.trim().toUpperCase(),
      categoryName,
    ])).filter(Boolean) as string[]

    if (matchKeys.length === 0) return

    const usersToNotify = await User.find({
      status: 'active',
      notify_email: true,
      pinned_categories: { $in: matchKeys },
    }).select('email username').lean() as Array<{ email?: string; username?: string }>

    if (!usersToNotify || usersToNotify.length === 0) return

    const courseCode = quiz.course_code || categoryName || 'môn học'

    // Fetch other recent published quizzes for this course code/category
    const otherQuizzesDocs = await Quiz.find({
      _id: { $ne: quiz._id },
      status: 'published',
      is_public: true,
      is_temp: { $ne: true },
      $or: [
        { category_id: quiz.category_id },
        { course_code: quiz.course_code },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(4)
      .select('_id title questions course_code')
      .lean() as Array<{ _id: any; title?: string; questions?: any[]; course_code?: string }>

    const otherQuizzes = otherQuizzesDocs.map((q) => ({
      id: q._id.toString(),
      title: q.title || `Quiz ${q.course_code || ''}`,
      questionCount: Array.isArray(q.questions) ? q.questions.length : 0,
    }))

    logger.info(
      { quizId: quiz._id, count: usersToNotify.length, courseCode, otherCount: otherQuizzes.length },
      'Enqueuing new quiz email notifications for pinned users'
    )

    for (const u of usersToNotify) {
      if (u.email) {
        await enqueueMail('new-quiz-notification', {
          to: u.email,
          username: u.username || 'bạn',
          courseCode,
          quizTitle: quiz.title || courseCode,
          quizId: quiz._id.toString(),
          otherQuizzes,
        })
      }
    }
  } catch (err) {
    logger.error({ err, quizId: quiz._id }, 'Error notifying pinned users of new quiz')
  }
}
