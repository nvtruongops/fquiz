import Link from 'next/link'
import { connectDB } from '@/lib/core/db/mongodb'
import { Category } from '@/lib/modules/quiz/models/Category'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { User } from '@/lib/modules/auth/models/User'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
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
  { key: 'categories', label: 'Mã môn', icon: Layers, color: 'text-success-fg', bg: 'bg-success-bg' },
  { key: 'quizzes', label: 'Mã quiz', icon: FileQuestion, color: 'text-info-fg', bg: 'bg-info-bg' },
  { key: 'users', label: 'Học viên', icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'sessions', label: 'Lượt thi', icon: ClipboardList, color: 'text-warning-fg', bg: 'bg-warning-bg' },
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
          <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Tổng quan hệ thống FQuiz</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map(({ key, label, icon: Icon, color, bg }) => (
            <Card key={key} className="bg-card border-border shadow-sm hover:shadow-md transition-shadow text-card-foreground">
              <CardContent className="pt-5 pb-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-card-foreground">{counts[key]}</p>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap gap-3">
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/admin/categories">Quản lý Categories</Link>
          </Button>
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/admin/quizzes">Quản lý Quizzes</Link>
          </Button>
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/admin/users">Quản lý Học viên</Link>
          </Button>
          <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/10">
            <Link href="/admin/settings">Cài đặt</Link>
          </Button>
        </div>

        {/* Recent Users */}
        <Card className="bg-card border-border shadow-sm text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-primary text-lg">Đăng ký gần đây</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
              <Link href="/admin/users" className="flex items-center gap-1">
                Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-muted-foreground text-sm">Chưa có học viên nào.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                    <tr>
                      <th className="text-left py-3 px-2 font-bold">Username</th>
                      <th className="text-left py-3 px-2 font-bold">Email</th>
                      <th className="text-left py-3 px-2 font-bold">Vai trò</th>
                      <th className="text-left py-3 px-2 font-bold">Trạng thái</th>
                      <th className="text-right py-3 px-2 font-bold">Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentUsers.map((u) => (
                      <tr key={String(u._id)} className="hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium text-card-foreground">{u.username}</td>
                        <td className="py-3 px-2 text-muted-foreground">{u.email}</td>
                        <td className="py-3 px-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            u.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                          }`}>
                            {u.role === 'admin' ? 'Admin' : 'Student'}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${u.status !== 'banned' ? 'bg-success-fg' : 'bg-destructive'}`} />
                            <span className="text-xs text-muted-foreground">{u.status === 'banned' ? 'Banned' : 'Active'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right text-muted-foreground">
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
