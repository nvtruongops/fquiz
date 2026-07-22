'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  ArrowRight,
  Zap,
  Bot,
  Map,
  Layers,
  BarChart3,
  Users,
  Flame,
  CheckCircle2,
  FileText,
  Award,
  Target,
  TrendingUp,
  HelpCircle,
  Compass,
} from 'lucide-react'

import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/ui/avatar'
import { Skeleton } from '@/components/shared/ui/skeleton'
import { Progress } from '@/components/shared/ui/progress'
import { cn } from '@/lib/core/utils/cn'
import { useAuth } from '@/hooks/auth/useAuth'
import { API_ROUTES } from '@/lib/core/constants/api-routes'

export default function DashboardPage() {
  const router = useRouter()
  const { data: authData } = useAuth()
  const user = authData?.user ?? null
  const isDevOrAdmin = user?.role === 'admin' || user?.role === 'dev'

  const { data, isLoading } = useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.STUDENT.DASHBOARD}`)
      if (!res.ok) throw new Error('Failed to fetch dashboard data')
      return res.json()
    }
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  const recentActivities = data?.recentActivities || []
  const incompleteSessions = recentActivities.filter((a: any) =>
    a.status === 'active' && !a.quizDeleted
  ) || []

  const primaryIncomplete = incompleteSessions[0]
  const stats = data?.stats || { totalQuizzes: 0, averageScore: '0.0', totalCorrectAnswers: 0 }
  const avgScoreNum = Number(stats.averageScore || 0)
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U'

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 font-sans text-slate-800 pb-6">
      {/* ── TOP HEADER: SLEEK GREETING & STATUS ─────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-[#5D7B6F]/20 shadow-xs shrink-0">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user?.name || 'User'} />}
            <AvatarFallback className="bg-gradient-to-br from-[#5D7B6F] to-slate-900 text-white font-black text-xs">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight">
                Xin chào, {user?.name || 'Học viên'}! 👋
              </h1>
              <Badge className="bg-[#5D7B6F]/10 text-[#5D7B6F] border border-[#5D7B6F]/20 text-[9px] font-extrabold uppercase rounded-full px-2 py-0.5">
                {isDevOrAdmin ? (user?.role === 'admin' ? 'Administrator' : 'Developer') : 'Student Member'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium">Chào mừng bạn quay lại hệ thống ôn luyện FQuiz.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs transition-all">
            <Link href="/explore">
              <Compass className="w-3.5 h-3.5 mr-1.5" /> Khám phá khóa học
            </Link>
          </Button>
        </div>
      </div>

      {/* ── IN-PROGRESS SESSION ALERT BANNER ──────────────────────── */}
      {primaryIncomplete && (
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-0.5 shadow-xs">
          <div className="bg-slate-900/95 backdrop-blur-md px-4 py-3 rounded-[14px] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-amber-500/30">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-xs">
                <Flame className="w-4 h-4 text-slate-950 animate-bounce" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0">
                    Đang dở dang
                  </Badge>
                  <span className="text-xs text-slate-400 font-semibold">{primaryIncomplete.quizCode}</span>
                </div>
                <h3 className="text-xs sm:text-sm font-black text-white truncate tracking-tight mt-0.5">
                  {primaryIncomplete.quizTitle}
                </h3>
              </div>
            </div>

            <Button asChild size="sm" className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-black rounded-xl text-xs h-8 px-4 cursor-pointer shrink-0 shadow-xs transition-all self-end sm:self-center">
              <Link href={
                primaryIncomplete.mode === 'flashcard'
                  ? `/quiz/${primaryIncomplete.quizId}/session/${primaryIncomplete.activeSessionId || primaryIncomplete.id}/flashcard`
                  : `/quiz/${primaryIncomplete.quizId}/session/${primaryIncomplete.activeSessionId || primaryIncomplete.id}`
              }>
                Tiếp tục ngay <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* ── STATS SUMMARY CARDS ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/95 backdrop-blur-md px-4 py-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#5D7B6F]/10 text-[#5D7B6F] flex items-center justify-center shrink-0 border border-[#5D7B6F]/20 shadow-2xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider truncate">Đã Hoàn Thành</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-slate-900 leading-none">{stats.totalQuizzes || 0}</span>
              <span className="text-xs text-slate-500 font-bold">bài tập</span>
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-md px-4 py-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/60 shadow-2xs">
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider truncate">Điểm Trung Bình</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-blue-600 leading-none">{avgScoreNum.toFixed(1)}</span>
              <span className="text-xs text-slate-500 font-bold">/ 10</span>
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-md px-4 py-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/60 shadow-2xs">
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider truncate">Câu Đúng</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-emerald-600 leading-none">{stats.totalCorrectAnswers || 0}</span>
              <span className="text-xs text-slate-500 font-bold">câu hỏi</span>
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-md px-4 py-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400 uppercase font-black tracking-wider text-[10px]">Hoàn Thiện</span>
            <span className="text-purple-600 font-black text-sm">{Math.min(Math.round(avgScoreNum * 10), 100)}%</span>
          </div>
          <Progress value={Math.min(avgScoreNum * 10, 100)} className="h-2 bg-slate-100 mt-2 rounded-full" />
        </div>
      </div>

      {/* ── 3 PILLARS + RECENT ACTIVITIES GRID ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* LEFT 8 COLS: FEATURED PILLAR CARDS */}
        <div className={cn("lg:col-span-8 grid gap-3", isDevOrAdmin ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>

          {/* PILLAR 1: HỌC NGÔN NGỮ AI (Only visible to Dev / Admin roles) */}
          {isDevOrAdmin && (
            <div className="group relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-[#5D7B6F] via-[#3f574d] to-slate-900 text-white shadow-xs border border-emerald-500/30 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <Bot className="w-4.5 h-4.5 text-amber-300" />
                  </div>
                  <Badge className="bg-white/20 text-emerald-100 border border-white/20 px-2 py-0.5 text-[9px] font-black uppercase rounded-full">
                    Học AI
                  </Badge>
                </div>

                <div>
                  <h2 className="text-base font-black text-white group-hover:text-amber-200 transition-colors">Học Ngôn Ngữ AI</h2>
                  <p className="text-xs text-emerald-100/90 leading-snug mt-1">
                    Trợ lý tra từ thông minh & lặp lại ngắt quãng FSRS.
                  </p>
                </div>

                <div className="space-y-2 text-xs font-semibold text-emerald-100/95 pt-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>Tra từ & ngữ pháp AI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>Lộ trình CEFR, JLPT, HSK</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>Thuật toán SRS / FSRS v4</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 shrink-0">
                <Button asChild size="sm" className="bg-white text-[#5D7B6F] hover:bg-emerald-50 font-black text-xs h-8 rounded-xl shadow-xs transition-all active:scale-[0.98]">
                  <Link href="/ai">Mở AI <ArrowRight className="w-3 h-3 ml-1" /></Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold text-xs h-8 rounded-xl transition-all active:scale-[0.98]">
                  <Link href="/roadmap">Lộ trình</Link>
                </Button>
              </div>
            </div>
          )}

          {/* PILLAR 2: ÔN THI TRẮC NGHIỆM */}
          <div className="group relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-indigo-700 via-blue-800 to-slate-900 text-white shadow-xs border border-blue-500/30 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <Zap className="w-4.5 h-4.5 text-blue-200" />
                </div>
                <Badge className="bg-white/20 text-blue-100 border border-white/20 px-2 py-0.5 text-[9px] font-black uppercase rounded-full">
                  Quiz Engine
                </Badge>
              </div>

              <div>
                <h2 className="text-base font-black text-white group-hover:text-blue-200 transition-colors">Ôn Thi Trắc Nghiệm</h2>
                <p className="text-xs text-blue-100/90 leading-snug mt-1">
                  Động cơ làm bài đa chế độ: Chấm ngay & Lật thẻ.
                </p>
              </div>

              <div className="space-y-2 text-xs font-semibold text-blue-100/95 pt-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span>Chấm ngay & Lật thẻ</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span>Mix Quiz tự động</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span>Ngân hàng đề chuẩn</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 shrink-0">
              <Button asChild size="sm" className="bg-white text-blue-900 hover:bg-blue-50 font-black text-xs h-8 rounded-xl shadow-xs transition-all active:scale-[0.98]">
                <Link href="/my-quizzes">Bộ đề <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold text-xs h-8 rounded-xl transition-all active:scale-[0.98]">
                <Link href="/explore">Khám phá</Link>
              </Button>
            </div>
          </div>

          {/* PILLAR 3: CỘNG ĐỒNG HỌC TẬP */}
          <div className="group relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-purple-700 via-violet-800 to-indigo-950 text-white shadow-xs border border-purple-500/30 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <Users className="w-4.5 h-4.5 text-purple-200" />
                </div>
                <Badge className="bg-white/20 text-purple-100 border border-white/20 px-2 py-0.5 text-[9px] font-black uppercase rounded-full">
                  Cộng Đồng
                </Badge>
              </div>

              <div>
                <h2 className="text-base font-black text-white group-hover:text-purple-200 transition-colors">Cộng Đồng Học Tập</h2>
                <p className="text-xs text-purple-100/90 leading-snug mt-1">
                  Diễn đàn trao đổi kiến thức & hỏi đáp sinh viên.
                </p>
              </div>

              <div className="space-y-2 text-xs font-semibold text-purple-100/95 pt-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                  <span>Hỏi bài + AI tự động đáp</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                  <span>Chia sẻ kinh nghiệm thi</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                  <span>Tương tác bài viết</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 shrink-0">
              <Button asChild size="sm" className="bg-white text-purple-900 hover:bg-purple-50 font-black text-xs h-8 rounded-xl shadow-xs transition-all active:scale-[0.98]">
                <Link href="/community">Diễn đàn <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold text-xs h-8 rounded-xl transition-all active:scale-[0.98]">
                <Link href="/community?action=new">Đăng bài</Link>
              </Button>
            </div>
          </div>

        </div>

        {/* RIGHT 4 COLS: RECENT ACTIVITIES FEED */}
        <div className="lg:col-span-4 flex flex-col justify-between">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-full space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#5D7B6F] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> Vừa Thực Hiện
              </h3>
              <Link href="/history" className="text-[11px] font-bold text-slate-400 hover:text-[#5D7B6F] transition-colors">
                Xem tất cả
              </Link>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto pr-0.5 scrollbar-thin">
              {!recentActivities || recentActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8 gap-2 h-full my-auto">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100/80 flex items-center justify-center text-slate-400 border border-slate-200/60 shadow-2xs">
                    <HelpCircle className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500 font-bold italic">Chưa có hoạt động gần đây.</p>
                  <Button asChild size="sm" className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-black text-xs h-8 px-4 rounded-xl shadow-xs transition-all mt-1">
                    <Link href="/explore">
                      Bắt đầu ngay <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              ) : (
                recentActivities.slice(0, 6).map((act: any) => (
                  <CompactActivityItem key={act.id} activity={act} router={router} />
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function CompactActivityItem({ activity, router }: { activity: any; router: any }) {
  const isCompleted = activity.status === 'completed'
  const isFlashcard = activity.mode === 'flashcard'

  const scoreNum = activity.score !== null && activity.score !== undefined ? Number(activity.score) : null
  const formattedScore = scoreNum !== null ? scoreNum.toFixed(2).replace(/\.00$/, '') : null

  const getScoreStyle = (score: number) => {
    if (score >= 8) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (score >= 5) return 'bg-blue-50 text-blue-700 border-blue-200'
    return 'bg-rose-50 text-rose-700 border-rose-200'
  }

  const handleClick = () => {
    if (activity.quizDeleted) return
    if (!isCompleted) {
      router.push(
        isFlashcard
          ? `/quiz/${activity.quizId}/session/${activity.activeSessionId || activity.id}/flashcard`
          : `/quiz/${activity.quizId}/session/${activity.activeSessionId || activity.id}`
      )
    } else {
      router.push(`/quiz/${activity.quizId}/result/${activity.id}`)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200',
        activity.quizDeleted ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200' : 'cursor-pointer hover:border-[#5D7B6F]/50 hover:bg-slate-50/80 bg-white border-slate-200/80 shadow-2xs'
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={cn(
            'w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 border',
            isFlashcard ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
          )}
        >
          {isFlashcard ? <Layers className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
        </div>

        <div className="min-w-0">
          <h4 className="text-xs font-black text-slate-800 truncate group-hover:text-[#5D7B6F] transition-colors leading-tight">
            {activity.quizCode || 'QUIZ'} — {activity.quizTitle}
          </h4>
          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
            {activity.completedAt
              ? formatDistanceToNow(new Date(activity.completedAt), { addSuffix: true, locale: vi })
              : 'Gần đây'}{' '}
            • {isFlashcard ? 'Flashcard' : 'Trắc nghiệm'}
          </span>
        </div>
      </div>

      <div className="shrink-0 ml-2">
        {!isCompleted ? (
          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full">
            Đang làm
          </Badge>
        ) : formattedScore !== null ? (
          <Badge className={cn('text-[10px] font-black border px-2 py-0.5 rounded-full', getScoreStyle(scoreNum!))}>
            {formattedScore}/10
          </Badge>
        ) : (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
            Hoàn thành
          </Badge>
        )}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 p-4">
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 grid grid-cols-2 gap-3">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <div className="lg:col-span-4">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
