import Link from 'next/link'
import { connectDB } from '@/lib/mongodb'
import { Category } from '@/models/Category'
import { Quiz } from '@/models/Quiz'
import { User } from '@/models/User'
import { QuizSession } from '@/models/QuizSession'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Layers, FileQuestion, Users, ClipboardList, ArrowRight } from 'lucide-react'

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
    }),
    User.countDocuments({ role: 'student' }),
    QuizSession.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: {
            student_id: '$student_id',
            quiz_id: '$quiz_id',
          },
        },
      },
      { $count: 'total' },
    ]),
    User.find().select(SENSITIVE_FIELDS).sort({ created_at: -1 }).limit(5).lean(),
  ])

  const sessionCount = uniqueAttemptsAgg[0]?.total ?? 0
  return { categoryCount, quizCount, userCount, sessionCount, recentUsers }
}

const statCards = [
  { key: 'categories', label: 'Mã môn', icon: Layers, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'quizzes', label: 'Mã quiz', icon: FileQuestion, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'users', label: 'Học viên', icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
  { key: 'sessions', label: 'Lượt thi', icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50' },
] as const

export default async function AdminDashboardPage() {
  const { categoryCount, quizCount, userCount, sessionCount, recentUsers } = await getDashboardData()
  const counts: Record<string, number> = {
    categories: categoryCount,
    quizzes: quizCount,
    users: userCount,
    sessions: sessionCount,
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-[#5D7B6F]">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Tổng quan hệ thống FQuiz</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map(({ key, label, icon: Icon, color, bg }) => (
            <Card key={key} className="bg-white border-[#A4C3A2]/50 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{counts[key]}</p>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap gap-3">
          <Button asChild className="bg-[#5D7B6F] hover:bg-[#4a6358]">
            <Link href="/admin/categories">Quản lý Categories</Link>
          </Button>
          <Button asChild className="bg-[#5D7B6F] hover:bg-[#4a6358]">
            <Link href="/admin/quizzes">Quản lý Quizzes</Link>
          </Button>
          <Button asChild className="bg-[#5D7B6F] hover:bg-[#4a6358]">
            <Link href="/admin/users">Quản lý Học viên</Link>
          </Button>
          <Button asChild variant="outline" className="border-[#5D7B6F] text-[#5D7B6F]">
            <Link href="/admin/settings">Cài đặt</Link>
          </Button>
        </div>

        {/* Recent Users */}
        <Card className="bg-white border-[#A4C3A2]/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-[#5D7B6F] text-lg">Đăng ký gần đây</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-[#5D7B6F]">
              <Link href="/admin/users" className="flex items-center gap-1">
                Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-gray-500 text-sm">Chưa có học viên nào.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="text-left py-3 px-2 font-bold">Username</th>
                      <th className="text-left py-3 px-2 font-bold">Email</th>
                      <th className="text-left py-3 px-2 font-bold">Vai trò</th>
                      <th className="text-left py-3 px-2 font-bold">Trạng thái</th>
                      <th className="text-right py-3 px-2 font-bold">Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentUsers.map((u) => (
                      <tr key={String(u._id)} className="hover:bg-gray-50/50">
                        <td className="py-3 px-2 font-medium text-gray-900">{u.username}</td>
                        <td className="py-3 px-2 text-gray-500">{u.email}</td>
                        <td className="py-3 px-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            u.role === 'admin' ? 'bg-[#A4C3A2]/20 text-[#5D7B6F]' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {u.role === 'admin' ? 'Admin' : 'Student'}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${u.status !== 'banned' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <span className="text-xs text-gray-500">{u.status === 'banned' ? 'Banned' : 'Active'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right text-gray-500">
                          {new Date(u.created_at).toLocaleDateString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
