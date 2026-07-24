'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, Zap, Bot, Flame, CheckCircle2, Award, Target, Compass, Loader2,
  TrendingUp, HelpCircle, Layers, Sparkles
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/ui/avatar'
import { Progress } from '@/components/shared/ui/progress'
import { cn } from '@/lib/core/utils/cn'

import { useStudentDashboard } from '@/hooks/useStudentDashboard'

export default function DashboardPage() {
  const {
    user,
    isDevOrAdmin,
    isLoading,
    recentActivities,
    primaryIncomplete,
    stats,
    avgScoreNum,
    userInitial,
  } = useStudentDashboard()

  const router = useRouter()

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#5D7B6F] mx-auto" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 font-sans text-slate-800 pb-6 p-6">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-[#5D7B6F]/20 shrink-0">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user?.name || 'User'} />}
            <AvatarFallback className="bg-[#5D7B6F] text-white font-black text-xs">
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
          <Button asChild size="sm" className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs">
            <Link href="/explore">
              <Compass className="w-3.5 h-3.5 mr-1.5" /> Khám phá khóa học
            </Link>
          </Button>
        </div>
      </div>

      {/* Incomplete Session Banner */}
      {primaryIncomplete && (
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-0.5 shadow-xs">
          <div className="bg-slate-900 px-4 py-3 rounded-[14px] text-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Flame className="w-5 h-5 text-amber-400 animate-bounce shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-amber-300">Đang dở dang • {primaryIncomplete.quizCode}</span>
                <h3 className="text-xs sm:text-sm font-black truncate">{primaryIncomplete.quizTitle}</h3>
              </div>
            </div>

            <Button asChild size="sm" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs h-8 px-4">
              <Link href={`/quiz/${primaryIncomplete.quizId}/session/${primaryIncomplete.activeSessionId || primaryIncomplete.id}`}>
                Tiếp tục ngay <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white px-4 py-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <CheckCircle2 className="w-6 h-6 text-[#5D7B6F]" />
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Đã Hoàn Thành</span>
            <span className="text-lg font-black text-slate-900">{stats.totalQuizzes || 0} bài</span>
          </div>
        </div>

        <div className="bg-white px-4 py-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <Award className="w-6 h-6 text-blue-600" />
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Điểm TB</span>
            <span className="text-lg font-black text-blue-600">{avgScoreNum.toFixed(1)} / 10</span>
          </div>
        </div>

        <div className="bg-white px-4 py-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <Target className="w-6 h-6 text-emerald-600" />
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Câu Đúng</span>
            <span className="text-lg font-black text-emerald-600">{stats.totalCorrectAnswers || 0}</span>
          </div>
        </div>

        <div className="bg-white px-4 py-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400 uppercase text-[10px]">Hoàn Thiện</span>
            <span className="text-purple-600 font-black">{Math.min(Math.round(avgScoreNum * 10), 100)}%</span>
          </div>
          <Progress value={Math.min(avgScoreNum * 10, 100)} className="h-2 bg-slate-100 mt-2 rounded-full" />
        </div>
      </div>

      {/* Main Content Grid: Quick Actions (Left 8 cols) & Recent Activities (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
        {/* LEFT 8 COLS: QUICK ACTIONS */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Mix Quiz */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-4 text-white shadow-xs flex flex-col justify-between group hover:shadow-md transition-all">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Zap className="w-4 h-4 text-emerald-200" />
              </div>
              <div>
                <h3 className="text-sm font-black">Ôn Tập Ngẫu Nhiên</h3>
                <p className="text-[11px] text-emerald-100/90 leading-snug mt-1">
                  Trộn câu hỏi từ nhiều đề thi để kiểm tra toàn diện.
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="bg-white text-emerald-800 hover:bg-emerald-50 font-black text-xs h-8 rounded-xl mt-3 shadow-xs">
              <Link href="/explore?tab=mix">Tạo bộ đề <ArrowRight className="w-3 h-3 ml-1" /></Link>
            </Button>
          </div>

          {/* Card 2: AI Studio */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-4 text-white shadow-xs flex flex-col justify-between group hover:shadow-md transition-all">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Bot className="w-4 h-4 text-blue-200" />
              </div>
              <div>
                <h3 className="text-sm font-black">AI Studio</h3>
                <p className="text-[11px] text-blue-100/90 leading-snug mt-1">
                  Trợ lý AI phân tích ngữ pháp, từ vựng & bài viết.
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="bg-white text-blue-900 hover:bg-blue-50 font-black text-xs h-8 rounded-xl mt-3 shadow-xs">
              <Link href="/ai">Khám phá AI <ArrowRight className="w-3 h-3 ml-1" /></Link>
            </Button>
          </div>

          {/* Card 3: Community */}
          <div className="bg-gradient-to-br from-purple-600 to-pink-700 rounded-2xl p-4 text-white shadow-xs flex flex-col justify-between group hover:shadow-md transition-all">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Sparkles className="w-4 h-4 text-purple-200" />
              </div>
              <div>
                <h3 className="text-sm font-black">Cộng Đồng Học Tập</h3>
                <p className="text-[11px] text-purple-100/90 leading-snug mt-1">
                  Diễn đàn trao đổi kiến thức & hỏi đáp sinh viên.
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="bg-white text-purple-900 hover:bg-purple-50 font-black text-xs h-8 rounded-xl mt-3 shadow-xs">
              <Link href="/community">Diễn đàn <ArrowRight className="w-3 h-3 ml-1" /></Link>
            </Button>
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
                <div className="flex flex-col items-center justify-center text-center py-6 gap-2 h-full my-auto">
                  <div className="w-9 h-9 rounded-2xl bg-slate-100/80 flex items-center justify-center text-slate-400 border border-slate-200/60 shadow-2xs">
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500 font-bold italic">Chưa có hoạt động gần đây.</p>
                  <Button asChild size="sm" className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-black text-xs h-8 px-4 rounded-xl shadow-xs transition-all mt-1">
                    <Link href="/explore">
                      Bắt đầu ngay <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              ) : (
                recentActivities.slice(0, 6).map((act) => (
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

