'use client'

import React, { useEffect, useState } from 'react'
import { 
  Trophy, 
  BookOpen, 
  Clock, 
  ArrowRight, 
  Zap,
  TrendingUp,
  ChevronRight,
  Compass,
  Loader2,
  GraduationCap,
  Target,
  Flame,
  Calendar,
  Shuffle,
  Play,
  CheckCircle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

  const activeSession = data?.recentActivities?.find((a: any) => a.hasActiveSession && !a.quizDeleted)
  const averageScore = Number(data?.stats?.averageScore || 0).toFixed(1)
  const totalCorrect = data?.stats?.totalCorrectAnswers || 0
  
  // Weekly data from API
  const weeklyData = data?.stats?.weeklyActivity || []
  const maxWeeklyVal = Math.max(...weeklyData.map((d: any) => d.val), 1)
  const normalizedWeeklyActivity = weeklyData.map((d: any) => ({
    ...d,
    percent: Math.max((d.val / maxWeeklyVal) * 100, 5) // Min 5% height for visibility
  }))

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      {/* ── Welcome Header ────────────────────────────────────────────────── */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1 md:space-y-2">
          <p className="text-[10px] md:text-[11px] font-black text-[#5D7B6F] uppercase tracking-[0.3em]">Bảng điều khiển học tập</p>
          <h1 className="text-2xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
            Chào {user?.name || 'Bạn học'}, <br className="hidden md:block" /> 
            hôm nay học gì nhỉ? 👋
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chuỗi học tập</p>
            <div className="flex items-center gap-1.5">
              <Flame className={cn("w-5 h-5", (data?.stats?.streak || 0) > 0 ? "text-orange-500 fill-orange-500" : "text-gray-300")} />
              <span className="text-2xl font-black text-gray-900">{data?.stats?.streak || 0}</span>
              <span className="text-sm font-bold text-gray-400">ngày</span>
            </div>
          </div>
          <div className="w-px h-10 bg-gray-100 hidden md:block mx-2" />
          <Button asChild className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl h-12 px-6 shadow-xl shadow-slate-900/10 transition-transform active:scale-95">
             <Link href="/explore">
                <Compass className="w-4 h-4 mr-2" />
                Khám phá
             </Link>
          </Button>
        </div>
      </section>

      {/* ── Main Action Hub ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Continue Learning Card */}
        <Card className="lg:col-span-2 rounded-[32px] border-none bg-white shadow-2xl shadow-[#5D7B6F]/5 overflow-hidden group relative">
          <CardContent className="p-0">
            <div className="relative p-6 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-3xl bg-[#5D7B6F]/10 flex items-center justify-center text-[#5D7B6F]">
                  <GraduationCap className="w-12 h-12" />
                </div>
                {activeSession && (
                   <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg animate-bounce">
                      ĐANG LÀM
                   </div>
                )}
              </div>
              
              <div className="flex-1 text-center md:text-left space-y-3">
                <Badge variant="secondary" className="bg-green-50 text-green-600 border-none font-black text-[10px] uppercase px-3 py-1">
                  {activeSession ? 'Phiên học dở' : 'Gợi ý ôn tập'}
                </Badge>
                <h3 className="text-2xl font-black text-gray-900 leading-tight">
                  {activeSession 
                    ? `${activeSession.categoryName} - ${activeSession.quizCode}`
                    : 'Sẵn sàng bắt đầu buổi học mới?'}
                </h3>
                <p className="text-sm font-bold text-gray-400 max-w-md">
                  {activeSession 
                    ? `Bạn đã hoàn thành ${activeSession.activeAnsweredCount}/${activeSession.activeTotalCount} câu. Tiếp tục để duy trì phong độ!`
                    : 'Hãy chọn một bộ đề trong thư viện hoặc tạo Quiz Trộn để kiểm tra kiến thức của mình ngay.'}
                </p>
                <div className="pt-2">
                  <Button asChild className="rounded-2xl px-8 h-12 bg-[#5D7B6F] hover:bg-[#4a6358] font-black transition-all group/btn shadow-lg shadow-[#5D7B6F]/20">
                    <Link href={activeSession ? `/quiz/${activeSession.quizId}/session/${activeSession.activeSessionId}` : '/explore'}>
                      {activeSession ? 'Tiếp tục ngay' : 'Bắt đầu ngay'} 
                      <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#5D7B6F]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none select-none" />
          </CardContent>
        </Card>

        {/* Quick Tools & Stats */}
        <div className="space-y-6">
          {/* Daily Goal Card */}
          <Card className="rounded-[32px] border-none bg-[#5D7B6F] text-white shadow-2xl shadow-[#5D7B6F]/20">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#A4C3A2]" />
                  <span className="text-[11px] font-black uppercase tracking-widest">Mục tiêu ngày</span>
                </div>
                <span className="text-xs font-black bg-white/10 px-2 py-1 rounded-lg">60%</span>
              </div>
              
              <div className="space-y-1">
                <p className="text-2xl font-black">30/50</p>
                <p className="text-[10px] font-bold text-white/60">Câu trả lời đúng hôm nay</p>
              </div>
              
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#A4C3A2] rounded-full w-[60%] transition-all duration-1000" />
              </div>
            </CardContent>
          </Card>

          {/* Mix Quiz Button */}
          <Link href="/explore?tab=mix">
            <Card className="rounded-[32px] border-none bg-white shadow-xl shadow-[#5D7B6F]/5 hover:shadow-2xl hover:shadow-[#5D7B6F]/10 transition-all group cursor-pointer overflow-hidden relative">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 group-hover:rotate-12 transition-transform">
                  <Shuffle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 text-sm">Trộn Quiz nhanh</h4>
                  <p className="text-[10px] font-bold text-gray-400">Ôn tập nhiều bộ đề cùng lúc</p>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-gray-300 group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* ── Analytics & History ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Activity Chart & Mini Stats */}
        <div className="lg:col-span-1 space-y-8">
          <section className="space-y-6">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-blue-50 rounded-xl text-blue-500">
                  <TrendingUp className="w-5 h-5" />
               </div>
               <h2 className="text-xl font-black text-gray-900 tracking-tight">Hoạt động tuần</h2>
            </div>
            
            <Card className="rounded-[32px] border-none bg-white shadow-xl shadow-[#5D7B6F]/5 p-6">
              <div className="flex items-end justify-between h-32 gap-2">
                {normalizedWeeklyActivity.map((d: any, i: number) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group/bar">
                    <div 
                      className={cn(
                        "w-full rounded-t-lg transition-all duration-500 group-hover/bar:brightness-110",
                        d.val > 0 ? "bg-[#5D7B6F]" : "bg-gray-100"
                      )}
                      style={{ height: `${d.percent}%` }}
                    />
                    <span className="text-[9px] font-black text-gray-400">{d.day}</span>
                  </div>
                ))}
              </div>
            </Card>
          </section>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-white shadow-xl shadow-[#5D7B6F]/5 border border-gray-50">
               <Trophy className="w-6 h-6 text-yellow-600 mb-3" />
               <p className="text-2xl font-black text-gray-900">{averageScore}</p>
               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Điểm TB</p>
            </div>
            <div className="p-5 rounded-3xl bg-white shadow-xl shadow-[#5D7B6F]/5 border border-gray-50">
               <Zap className="w-6 h-6 text-purple-600 mb-3" />
               <p className="text-2xl font-black text-gray-900">{totalCorrect}</p>
               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Câu đúng</p>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-slate-100 rounded-xl text-slate-500">
                  <Calendar className="w-5 h-5" />
               </div>
               <h2 className="text-xl font-black text-gray-900 tracking-tight">Lịch sử làm bài</h2>
            </div>
            <Button variant="ghost" asChild className="text-[10px] font-black text-[#5D7B6F] uppercase tracking-widest hover:bg-[#5D7B6F]/5">
              <Link href="/history">
                Xem tất cả <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="space-y-4">
            {!data?.recentActivities || data.recentActivities.length === 0 ? (
              <div className="p-12 rounded-[32px] bg-white border-2 border-dashed border-gray-100 flex flex-col items-center text-center space-y-4">
                 <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Chưa có hoạt động nào</p>
                 <Button asChild variant="outline" className="rounded-xl border-[#5D7B6F]/10 text-[#5D7B6F]">
                    <Link href="/explore">Khám phá ngay</Link>
                 </Button>
              </div>
            ) : (
              data.recentActivities.slice(0, 5).map((activity: any) => (
                <Link
                  key={activity.id}
                  href={activity.quizDeleted ? '#' : (activity.status === 'active' ? `/quiz/${activity.quizId}/session/${activity.activeSessionId}` : `/history/${activity.quizId}`)}
                  className={cn(
                    "flex items-center gap-4 p-5 rounded-[24px] bg-white border border-gray-50 transition-all group shadow-sm hover:shadow-md hover:border-[#5D7B6F]/20",
                    activity.quizDeleted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 shadow-inner",
                    activity.status === 'completed' ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
                  )}>
                    {activity.status === 'completed' ? <CheckCircle className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-gray-900 text-[13px] truncate uppercase tracking-tight group-hover:text-[#5D7B6F] transition-colors">
                        {activity.quizCode}
                      </h4>
                      {activity.status === 'active' && (
                        <span className="text-[8px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md uppercase">Đang làm</span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 truncate">
                      {activity.categoryName} • {formatDistanceToNow(new Date(activity.activityAt), { addSuffix: true, locale: vi })}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={cn(
                      "text-xl font-black leading-none tracking-tight",
                      activity.status === 'active' ? "text-gray-300" : "text-[#5D7B6F]"
                    )}>
                      {activity.status === 'active' ? '--' : `${activity.score}/10`}
                    </p>
                    <p className="text-[8px] font-black text-gray-300 uppercase mt-1">
                      {activity.correctCount}/{activity.totalCount} ĐÚNG
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
