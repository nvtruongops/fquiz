'use client'

import React from 'react'
import Link from 'next/link'
import {
  ArrowRight, Zap, Bot, Flame, Compass,
  TrendingUp, HelpCircle, Layers, Sparkles, BookOpen, RefreshCw, BookMarked, Pin
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/ui/avatar'
import { cn } from '@/lib/core/utils/cn'

import { useStudentDashboard, ActivityItem } from '@/hooks/useStudentDashboard'

export default function DashboardPage() {
  const {
    user,
    isDevOrAdmin,
    isLoading,
    isRefetching,
    refetch,
    recentActivities,
    pinnedCategories,
    primaryIncomplete,
    userInitial,
  } = useStudentDashboard()

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 font-sans text-slate-800 pb-10 p-4 sm:p-6 md:p-8">
      {/* 1. Header Greeting & Hero Card */}
      <div className="relative overflow-hidden bg-white/90 backdrop-blur-xl p-5 sm:p-7 rounded-[28px] border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-gradient-to-br from-[#5D7B6F]/10 via-[#A4C3A2]/15 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start sm:items-center gap-4 relative z-10">
          <Avatar className="h-14 w-14 ring-4 ring-[#5D7B6F]/15 shrink-0 shadow-xs">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user?.name || 'User'} />}
            <AvatarFallback className="bg-gradient-to-br from-[#5D7B6F] to-[#4A6359] text-white font-black text-lg">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">
                Xin chào, {user?.name || 'Học viên'}! 👋
              </h1>
              <Badge className="bg-[#5D7B6F]/10 text-[#5D7B6F] border border-[#5D7B6F]/25 text-[10px] font-extrabold uppercase rounded-full px-2.5 py-0.5">
                {isDevOrAdmin ? (user?.role === 'admin' ? 'Administrator' : 'Developer') : 'Student Member'}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Sẵn sàng cho các thử thách trắc nghiệm & bài học hôm nay cùng FQuiz!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 relative z-10 self-start md:self-auto">
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="h-10 w-10 p-0 rounded-2xl border-slate-200 text-slate-500 hover:text-[#5D7B6F] hover:bg-slate-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={cn('w-4 h-4', isRefetching && 'animate-spin text-[#5D7B6F]')} />
          </Button>
          <Button asChild size="sm" className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-black text-xs h-10 px-5 rounded-2xl shadow-xs transition-all">
            <Link href="/explore">
              <Compass className="w-4 h-4 mr-2" /> Khám phá đề thi
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Incomplete Session Banner (High-Priority Alert) */}
      {primaryIncomplete && <IncompleteSessionBanner item={primaryIncomplete} />}

      {/* 2.5. Pinned Categories — Quick Access (synced with /explore pins) */}
      {pinnedCategories.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Pin className="w-4 h-4 text-amber-500 fill-amber-500" /> Môn Học Đã Ghim
            </h2>
            <Link href="/explore" className="text-[11px] font-bold text-slate-400 hover:text-[#5D7B6F] transition-colors">
              Quản lý ghim
            </Link>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pt-1.5 -mt-1.5 pb-2 scrollbar-thin">
            {pinnedCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/courses/${encodeURIComponent(cat.name.toLowerCase())}`}
                className="group relative flex items-center gap-2.5 pl-3.5 pr-3 py-2.5 rounded-2xl bg-white/90 backdrop-blur-xl border border-amber-200/70 shadow-2xs hover:border-[#5D7B6F]/60 hover:shadow-md hover:-translate-y-0.5 hover:z-10 active:scale-[0.98] transition-all duration-200 shrink-0"
              >
                <span className="w-7 h-7 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0 group-hover:bg-[#5D7B6F]/10 group-hover:border-[#5D7B6F]/30 transition-colors">
                  <BookOpen className="w-3.5 h-3.5 text-amber-600 group-hover:text-[#5D7B6F] transition-colors" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-black text-slate-800 uppercase tracking-tight truncate group-hover:text-[#5D7B6F] transition-colors">
                    {cat.name}
                  </span>
                  <span className="block text-[10px] font-bold text-slate-400">
                    {cat.quizCount} đề thi
                  </span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#5D7B6F] group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 3. Quick Action Learning Hub & Recent Activities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
        <LearningStudioGrid isDevOrAdmin={isDevOrAdmin} />

        {/* RIGHT 4 COLS: RECENT ACTIVITIES FEED */}
        <div className="lg:col-span-4 flex flex-col justify-between">
          <div className="bg-white p-5 rounded-[24px] border border-slate-200/80 shadow-xs flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#5D7B6F] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> Hoạt Động Gần Đây
              </h3>
              <Link href="/history" className="text-[11px] font-bold text-slate-400 hover:text-[#5D7B6F] transition-colors">
                Xem tất cả
              </Link>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5 scrollbar-thin">
              {!recentActivities || recentActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8 gap-2.5 h-full my-auto">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100/80 flex items-center justify-center text-slate-400 border border-slate-200/60 shadow-2xs">
                    <HelpCircle className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500 font-bold italic">Chưa có lịch sử làm bài gần đây.</p>
                  <Button asChild size="sm" className="bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-black text-xs h-8 px-4 rounded-xl shadow-xs transition-all mt-1">
                    <Link href="/explore">
                      Làm bài ngay <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              ) : (
                recentActivities.slice(0, 6).map((act) => (
                  <CompactActivityItem key={act.id} activity={act} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function IncompleteSessionBanner({ item }: { item: ActivityItem }) {
  const resumeSessionId = item.activeSessionId || item.id
  const isFlashcardMode = item.mode === 'flashcard'
  const resumeHref = `/quiz/${item.quizId}/session/${resumeSessionId}${isFlashcardMode ? '/flashcard' : ''}`
  const answeredCount = item.hasActiveSession ? (item.activeAnsweredCount ?? 0) : (item.correctCount ?? 0)
  const totalCount = item.hasActiveSession ? (item.activeTotalCount ?? 0) : (item.totalCount ?? 0)

  return (
    <div className="overflow-hidden rounded-[24px] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-0.5 shadow-md transform-gpu hover:scale-[1.005] transition-all">
      <div className="bg-slate-900/95 backdrop-blur-xl px-5 py-4 rounded-[22px] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 text-amber-400 animate-bounce" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                Bài thi chưa hoàn thành • {item.quizCode}
              </span>
              {totalCount > 0 && (
                <span className="text-[10px] font-black uppercase tracking-wider text-white/70 bg-white/10 px-2 py-0.5 rounded-md border border-white/10">
                  Đã làm {answeredCount}/{totalCount} câu
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-black truncate text-white">{item.quizTitle}</h3>
          </div>
        </div>

        <Button asChild size="sm" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs h-9 px-5 shrink-0 shadow-sm">
          <Link href={resumeHref}>
            Tiếp tục ngay <ArrowRight className="w-4 h-4 ml-1.5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

function LearningStudioGrid({ isDevOrAdmin }: { isDevOrAdmin?: boolean }) {
  return (
    <div className="lg:col-span-8 space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#5D7B6F]" /> Không Gian Luyện Tập
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Bento 1: Mix Quiz */}
        <div className="bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-900 rounded-[24px] p-5 text-white shadow-xs flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Zap className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-base font-black">Ôn Tập Ngẫu Nhiên (Mix Quiz)</h3>
              <p className="text-xs text-emerald-100/90 leading-relaxed mt-1.5 font-medium">
                Trộn câu hỏi ngẫu nhiên từ nhiều môn học để rèn phản xạ và kiểm tra toàn diện.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs h-9 rounded-xl mt-4 shadow-sm w-fit relative z-10">
            <Link href="/explore?tab=mix">
              Tạo đề ngẫu nhiên <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>

        {/* Bento 2: AI Studio (Conditional) */}
        {isDevOrAdmin && (
          <div className="bg-gradient-to-br from-indigo-700 via-blue-700 to-indigo-900 rounded-[24px] p-5 text-white shadow-xs flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="space-y-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Bot className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <h3 className="text-base font-black">AI Studio Học Tập</h3>
                <p className="text-xs text-blue-100/90 leading-relaxed mt-1.5 font-medium">
                  Sinh từ vựng, đoạn văn, ngữ pháp & giải thích đáp án bằng trí tuệ nhân tạo.
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="bg-white text-blue-900 hover:bg-blue-50 font-black text-xs h-9 rounded-xl mt-4 shadow-sm w-fit relative z-10">
              <Link href="/ai">
                Khám phá AI Studio <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        )}

        {/* Bento 3: Community */}
        <div className="bg-gradient-to-br from-purple-700 via-violet-700 to-purple-900 rounded-[24px] p-5 text-white shadow-xs flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Sparkles className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <h3 className="text-base font-black">Diễn Đàn Cộng Đồng</h3>
              <p className="text-xs text-purple-100/90 leading-relaxed mt-1.5 font-medium">
                Đặt câu hỏi, thảo luận bài tập & chia sẻ kinh nghiệm học tập cùng sinh viên.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-white text-purple-900 hover:bg-purple-50 font-black text-xs h-9 rounded-xl mt-4 shadow-sm w-fit relative z-10">
            <Link href="/community">
              Vào diễn đàn <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>

        {/* Bento 4: CEFR Language Learning Courses (Conditional) */}
        {isDevOrAdmin && (
          <div className="bg-gradient-to-br from-amber-600 via-orange-600 to-rose-700 rounded-[24px] p-5 text-white shadow-xs flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="space-y-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                <BookMarked className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <h3 className="text-base font-black">Khóa Học Ngôn Ngữ CEFR</h3>
                <p className="text-xs text-amber-100/90 leading-relaxed mt-1.5 font-medium">
                  Học theo lộ trình bài học chuẩn CEFR (A1-C2) kết hợp thuật toán lặp lại ngắt quãng (FSRS).
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="bg-white text-orange-950 hover:bg-amber-50 font-black text-xs h-9 rounded-xl mt-4 shadow-sm w-fit relative z-10">
              <Link href="/explore">
                Học theo khóa học <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function getScoreStyle(score: number) {
  if (score >= 8) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (score >= 6.5) return 'bg-blue-50 text-blue-700 border-blue-200'
  if (score >= 5) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-rose-50 text-rose-700 border-rose-200'
}

function ActivityStatusBadge({ isResumable, formattedScore, scoreNum }: { isResumable: boolean; formattedScore: string | null; scoreNum: number | null }) {
  if (isResumable) {
    return (
      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full">
        Đang dở
      </Badge>
    )
  }
  if (formattedScore !== null && scoreNum !== null) {
    return (
      <Badge className={cn('text-[10px] font-black border px-2 py-0.5 rounded-full', getScoreStyle(scoreNum))}>
        {formattedScore}/10
      </Badge>
    )
  }
  return (
    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
      Xong
    </Badge>
  )
}

function getActivityHref(activity: ActivityItem, isResumable: boolean): string {
  if (!isResumable) return `/quiz/${activity.quizId}/result/${activity.id}`
  const resumeSessionId = activity.activeSessionId || activity.id
  return activity.mode === 'flashcard'
    ? `/quiz/${activity.quizId}/session/${resumeSessionId}/flashcard`
    : `/quiz/${activity.quizId}/session/${resumeSessionId}`
}

function formatActivityDetails(activity: ActivityItem) {
  const isResumable = activity.status === 'active' || activity.hasActiveSession === true
  const isFlashcard = activity.mode === 'flashcard'
  const scoreNum = activity.score != null ? Number(activity.score) : null
  const formattedScore = scoreNum !== null ? scoreNum.toFixed(1).replace(/\.0$/, '') : null

  const progressAnswered = activity.hasActiveSession ? (activity.activeAnsweredCount ?? 0) : (activity.correctCount ?? 0)
  const progressTotal = activity.hasActiveSession ? (activity.activeTotalCount ?? 0) : (activity.totalCount ?? 0)
  const progressText = progressTotal > 0 ? ` • ${progressAnswered}/${progressTotal} câu` : ''

  const displayTime = activity.activityAt || activity.completedAt
  const timeAgo = displayTime ? formatDistanceToNow(new Date(displayTime), { addSuffix: true, locale: vi }) : 'Gần đây'

  return { isResumable, isFlashcard, scoreNum, formattedScore, progressText, timeAgo }
}

function DeletedActivityItem({ title, timeAgo }: { title: string; timeAgo: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 opacity-50 cursor-not-allowed bg-slate-50 border-slate-200">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs bg-emerald-50 text-[#5D7B6F] border-emerald-200">
          <Zap className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-black text-slate-800 truncate leading-snug">{title}</h4>
          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">{timeAgo} • Đã xóa</span>
        </div>
      </div>
    </div>
  )
}

function CompactActivityItem({ activity }: { activity: ActivityItem }) {
  const { isResumable, isFlashcard, scoreNum, formattedScore, progressText, timeAgo } = formatActivityDetails(activity)

  if (activity.quizDeleted) {
    return <DeletedActivityItem title={activity.quizTitle} timeAgo={timeAgo} />
  }

  return (
    <Link
      href={getActivityHref(activity, isResumable)}
      className="group flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 cursor-pointer hover:border-[#5D7B6F]/50 hover:bg-slate-50/80 bg-white border-slate-200/80 shadow-2xs"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs',
            isFlashcard ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-[#5D7B6F] border-emerald-200'
          )}
        >
          {isFlashcard ? <Layers className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
        </div>

        <div className="min-w-0">
          <h4 className="text-xs font-black text-slate-800 truncate group-hover:text-[#5D7B6F] transition-colors leading-snug">
            {activity.quizCode || 'QUIZ'} — {activity.quizTitle}
          </h4>
          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
            {timeAgo} • {isFlashcard ? 'Flashcard' : 'Trắc nghiệm'}
            {isResumable && <span className="text-amber-600 font-bold">{progressText}</span>}
          </span>
        </div>
      </div>

      <div className="shrink-0 ml-2">
        <ActivityStatusBadge isResumable={isResumable} formattedScore={formattedScore} scoreNum={scoreNum} />
      </div>
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 font-sans text-slate-800 pb-10 p-4 sm:p-6 md:p-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-white/90 p-5 sm:p-7 rounded-[28px] border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-slate-200 shrink-0" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 rounded-lg" />
            <div className="h-4 w-64 bg-slate-100 rounded-lg" />
          </div>
        </div>
        <div className="h-10 w-36 bg-slate-200 rounded-2xl shrink-0" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 rounded-[24px] bg-slate-200/70 p-5 flex flex-col justify-between" />
          ))}
        </div>
        <div className="lg:col-span-4 h-96 rounded-[24px] bg-white p-5 border border-slate-200/80 space-y-4">
          <div className="h-5 w-32 bg-slate-200 rounded-md" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
