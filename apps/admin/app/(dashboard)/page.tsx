import Link from 'next/link'
import { connectDB } from '@/lib/db/mongodb'
import { Category } from '@/lib/models/Category'
import { Quiz } from '@/lib/models/Quiz'
import { User } from '@/lib/models/User'
import { QuizSession } from '@/lib/models/QuizSession'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Layers, FileQuestion, Users, ClipboardList, ArrowRight, ShieldCheck } from 'lucide-react'

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
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Tổng quan các chỉ số hoạt động hệ thống FQuiz</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map(({ key, label, icon: Icon, color, bg }) => (
          <Card key={key} className="bg-card border-border shadow-xs hover:shadow-md transition-shadow text-card-foreground">
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

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/categories">Quản lý Categories</Link>
        </Button>
        <Button asChild>
          <Link href="/quizzes">Quản lý Quizzes</Link>
        </Button>
        <Button asChild>
          <Link href="/question-bank">Ngân hàng câu hỏi</Link>
        </Button>
        <Button asChild>
          <Link href="/users">Quản lý Học viên</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/settings">Cài đặt Hệ thống</Link>
        </Button>
      </div>

      {/* Recent Registrations */}
      <Card className="bg-card border-border shadow-xs text-card-foreground">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-foreground text-lg">Đăng ký gần đây</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/users" className="flex items-center gap-1">
              Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentUsers.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Chưa có học viên nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="text-left py-3 px-3 font-semibold">Học viên</th>
                    <th className="text-left py-3 px-3 font-semibold">Email</th>
                    <th className="text-left py-3 px-3 font-semibold">Vai trò</th>
                    <th className="text-left py-3 px-3 font-semibold">Trạng thái</th>
                    <th className="text-right py-3 px-3 font-semibold">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentUsers.map((u: any) => (
                    <tr key={u._id.toString()} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-3 font-medium text-foreground">{u.username}</td>
                      <td className="py-3 px-3 text-muted-foreground">{u.email}</td>
                      <td className="py-3 px-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          u.status === 'active' 
                            ? 'bg-success-bg text-success-fg border border-success-border'
                            : 'bg-destructive/10 text-destructive border border-destructive/30'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-xs text-muted-foreground">
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
  )
}
