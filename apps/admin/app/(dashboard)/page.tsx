import { connectDB } from '@/lib/db/mongodb'
import { Category } from '@/lib/models/Category'
import { Quiz } from '@/lib/models/Quiz'
import { User } from '@/lib/models/User'
import { QuizSession } from '@/lib/models/QuizSession'
import { AdminDashboardContent } from '@/components/dashboard/AdminDashboardContent'

export const dynamic = 'force-dynamic'

const SENSITIVE_FIELDS = '-password_hash -reset_token -reset_token_expires'

async function getDashboardData() {
  await connectDB()
  const [categoryCount, quizCount, userCount, uniqueAttemptsAgg, recentUsers] = await Promise.all([
    Category.countDocuments({ type: 'public', status: 'approved' }),
    Quiz.countDocuments({
      status: 'published',
      is_public: true,
      is_saved_from_explore: { $ne: true },
      is_temp: { $ne: true },
    }),
    User.countDocuments({ role: 'student' }),
    QuizSession.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: { student_id: '$student_id', quiz_id: '$quiz_id' } } },
      { $count: 'total' },
    ]),
    User.find().select(SENSITIVE_FIELDS).sort({ created_at: -1 }).limit(5).lean(),
  ])

  const sessionCount = uniqueAttemptsAgg[0]?.total ?? 0
  return { categoryCount, quizCount, userCount, sessionCount, recentUsers }
}

export default async function AdminDashboardPage() {
  const { categoryCount, quizCount, userCount, sessionCount, recentUsers } = await getDashboardData()
  const counts: Record<string, number> = {
    categories: categoryCount,
    quizzes: quizCount,
    users: userCount,
    sessions: sessionCount,
  }

  const serializableUsers = recentUsers.map((user) => ({
    _id: String(user._id),
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    created_at: new Date(user.created_at).toISOString(),
  }))

  return <AdminDashboardContent counts={counts} recentUsers={serializableUsers} />
}
