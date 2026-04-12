'use client'

import React, { useEffect, useState } from 'react'
import { 
  Trophy, 
  BookOpen, 
  Clock, 
  ArrowRight, 
  Search,
  Zap,
  TrendingUp,
  ChevronRight,
  Compass,
  Loader2,
  GraduationCap
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

function sourceText(sourceLabel: string, sourceCreatorName: string | null) {
  if (!sourceCreatorName) return sourceLabel
  return `${sourceLabel} • ${sourceCreatorName}`
}

export default function DashboardPage() {
  const [user, setUser] = useState<{ name: string } | null>(null)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/me`).then(res => {
      if (res.ok) res.json().then(data => setUser(data.user))
    })
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/dashboard`)
      if (!res.ok) throw new Error('Failed to fetch dashboard data')
      return res.json()
    }
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-[#5D7B6F] animate-spin" />
        <p className="text-xs font-black text-[#5D7B6F] uppercase tracking-widest">Đang tải chớp nhoáng...</p>
      </div>
    )
  }

  const learningHoursFloat = Number(data?.stats?.learningHours || 0)
  const learningHoursDisplay = learningHoursFloat.toFixed(2)
  const learningTimeDisplay = `${learningHoursDisplay}h`

  const stats = [
    { label: 'Bộ đề đã làm', value: data?.stats?.totalQuizzes || '0', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Điểm trung bình', value: data?.stats?.averageScore || '0.0', icon: Trophy, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Thời gian học', value: learningTimeDisplay, icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Câu trả lời đúng', value: data?.stats?.totalCorrectAnswers || '0', icon: Zap, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[40px] bg-[#5D7B6F] p-8 md:p-12 text-white shadow-2xl shadow-[#5D7B6F]/20">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight leading-tight">
            Chào mừng trở lại, <span className="text-[#A4C3A2]">{user?.name || 'Bạn học'}</span>! 👋
          </h1>
          <p className="text-[#EAE7D6]/80 text-lg mb-8 font-bold leading-relaxed">
            Hôm nay là một ngày tuyệt vời để chinh phục những kiến thức mới. 
            Bạn muốn ôn tập bộ đề nào đầu tiên?
          </p>
          <div className="relative max-w-md group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#5D7B6F] w-5 h-5 group-focus-within:scale-110 transition-transform" />
            <Input 
              placeholder="Tìm kiếm bộ đề hoặc mã số..." 
              className="pl-16 py-7 bg-[#EAE7D6] text-[#5D7B6F] border-none rounded-2xl shadow-inner font-bold focus-visible:ring-4 focus-visible:ring-[#A4C3A2]/30 transition-all placeholder:text-[#5D7B6F]/40"
            />
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-[#A4C3A2]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 translate-y-1/4 -translate-x-1/4 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-xl shadow-[#5D7B6F]/5 rounded-3xl hover:shadow-2xl hover:shadow-[#5D7B6F]/10 transition-all duration-500 group hover:-translate-y-2">
            <CardContent className="p-8 flex flex-col items-center sm:items-start text-center sm:text-left gap-6">
              <div className={cn(stat.bg, stat.color, "p-4 rounded-2xl group-hover:rotate-12 transition-all shadow-sm")}>
                <stat.icon className="w-8 h-8" />
              </div>
              <div>
                <p className="text-4xl font-black text-gray-800 tracking-tighter">{stat.value}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-[#5D7B6F] flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#5D7B6F]/5 flex items-center justify-center">
                 <TrendingUp className="w-6 h-6" />
              </div>
              Hoạt động gần đây
            </h2>
            <Button variant="ghost" asChild className="text-xs font-black text-[#5D7B6F] uppercase tracking-widest hover:bg-[#5D7B6F]/5">
              <Link href="/history">
                Xem tất cả <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
          
          <div className="space-y-4">
            {!data?.recentActivities || data.recentActivities.length === 0 ? (
              <div className="p-12 rounded-[32px] bg-white border-2 border-dashed border-gray-100 flex flex-col items-center text-center space-y-4">
                 <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-200">
                    <BookOpen className="w-8 h-8" />
                 </div>
                 <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Chưa có hoạt động nào</p>
                 <Button asChild variant="outline" className="rounded-xl border-[#5D7B6F]/10 text-[#5D7B6F]">
                    <Link href="/explore">Khám phá ngay</Link>
                 </Button>
              </div>
            ) : (
              data.recentActivities.map((activity: any) => (
                <Link
                  key={activity.id}
                  href={`/history/${activity.quizId || activity.id}`}
                  className="flex items-center gap-6 p-6 rounded-[28px] bg-white border border-[#5D7B6F]/5 hover:border-[#5D7B6F]/20 transition-all group cursor-pointer shadow-xl shadow-[#5D7B6F]/5"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-[#5D7B6F] group-hover:bg-[#A4C3A2]/10 transition-colors shadow-inner">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-gray-800 group-hover:text-[#5D7B6F] transition-colors truncate text-lg">
                      {(activity.categoryName || 'Chưa phân loại')} - {(activity.quizCode || 'N/A')}
                    </h3>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                      {activity.status === 'completed' && activity.hasActiveSession ? (
                        <>
                          <span className="text-[#5D7B6F]">Đã hoàn thành</span>
                          <span>•</span>
                          <span className="text-orange-500">Đang làm lại</span>
                        </>
                      ) : activity.status === 'active' ? (
                        <span className="text-[#A4C3A2]">Đang làm dở</span>
                      ) : (
                        <span className="text-[#5D7B6F]">Hoàn thành</span>
                      )}
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(activity.activityAt), { addSuffix: true, locale: vi })}</span>
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full bg-[#f2f2f2] px-2 py-0.5 text-[10px] font-semibold text-[#5D7B6F]">
                        {sourceText(activity.sourceLabel, activity.sourceCreatorName)}
                      </span>
                      {activity.hasActiveSession && (
                        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
                          {activity.activeAnsweredCount}/{activity.activeTotalCount} câu đang làm
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-[#5D7B6F] leading-none">
                      {activity.status === 'active' ? '--' : `${activity.score}/10`}
                    </p>
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-tighter mt-1">
                      {activity.status === 'active'
                        ? `${activity.correctCount}/${activity.totalCount} CÂU ĐÃ LÀM`
                        : `${activity.correctCount}/${activity.totalCount} CÂU ĐÚNG`}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Quick Actions / Highlights */}
        <section className="space-y-6">
          <h2 className="text-2xl font-black text-[#5D7B6F]">Đề xuất cho bạn</h2>
          <Card className="rounded-[32px] border-none bg-white shadow-xl shadow-[#5D7B6F]/5 overflow-hidden group">
             <CardContent className="p-8 space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                   <Compass className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-xl font-black text-gray-800">Khám phá thư viện</h3>
                   <p className="text-sm font-bold text-gray-400 leading-relaxed">
                      Có các bộ đề thi chất lượng đang chờ bạn chinh phục.
                   </p>
                </div>
                <Button asChild className="w-full bg-[#5D7B6F] rounded-2xl py-6 font-black uppercase tracking-widest text-xs">
                   <Link href="/explore">Xem ngay nào <ArrowRight className="w-4 h-4 ml-2" /></Link>
                </Button>
             </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
