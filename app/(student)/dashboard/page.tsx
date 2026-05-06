'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Zap,
  Compass,
  Loader2,
  GraduationCap,
  Calendar,
  Play,
  BookOpen,
  Clock,
  Shuffle,
  RotateCcw,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

export default function DashboardPage() {
  const router = useRouter()
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
        <p className="text-xs font-black text-[#5D7B6F] uppercase tracking-widest">Đang tải...</p>
      </div>
    )
  }

  // Find incomplete sessions (active sessions)
  const incompleteSessions = data?.recentActivities?.filter((a: any) =>
    a.status === 'active' && !a.quizDeleted
  ) || []

  // Get the most recent incomplete session
  const primaryIncomplete = incompleteSessions[0]

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      <div className="w-full py-8 md:py-12 space-y-8">

        {/* ── Header ────────────────────────────────────────────────── */}
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-[#5D7B6F]/60">
            <div className="h-1 w-1 rounded-full bg-[#5D7B6F]/60" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Bảng điều khiển học tập</p>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
            Chào {user?.name || 'bạn'}, <br className="md:hidden" />
            hôm nay học gì nhỉ?
          </h1>
        </header>

        {/* ── Main Action Card ────────────────────────────────────────────────── */}
        {primaryIncomplete ? (
          // Has incomplete session - Show continue card
          <Card className="rounded-3xl border-none bg-white shadow-2xl shadow-[#5D7B6F]/10 overflow-hidden group relative">
            <CardContent className="p-0">
              <div className="relative p-8 md:p-10">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#5D7B6F]/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
                  {/* Icon */}
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center text-orange-600 shadow-lg shadow-orange-500/20">
                      <Play className="w-10 h-10" />
                    </div>
                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow-lg animate-pulse">
                      ĐANG LÀM
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 rounded-full">
                      <Clock className="w-3 h-3 text-orange-600" />
                      <span className="text-[10px] font-black text-orange-600 uppercase tracking-wider">Phiên học chưa hoàn thành</span>
                    </div>

                    <div>
                      <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-2">
                        {primaryIncomplete.quizCode}
                      </h2>
                      <p className="text-sm font-medium text-gray-500">
                        {primaryIncomplete.categoryName}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#5D7B6F]" />
                        <span className="text-sm font-bold text-gray-600">
                          {primaryIncomplete.correctCount || 0}/{primaryIncomplete.totalCount || 0} câu
                        </span>
                      </div>
                      <div className="h-4 w-px bg-gray-200" />
                      <div className="flex items-center gap-2">
                        {primaryIncomplete.mode === 'flashcard' ? (
                          <GraduationCap className="w-4 h-4 text-purple-600" />
                        ) : primaryIncomplete.mode === 'review' ? (
                          <BookOpen className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Zap className="w-4 h-4 text-green-600" />
                        )}
                        <span className="text-xs font-bold text-gray-500 uppercase">
                          {primaryIncomplete.mode === 'flashcard' ? 'Lật thẻ' :
                            primaryIncomplete.mode === 'review' ? 'Kiểm tra' : 'Luyện tập'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
                    <Button asChild className="rounded-2xl px-8 h-12 bg-[#5D7B6F] hover:bg-[#4a6358] font-black text-white shadow-xl shadow-[#5D7B6F]/20 transition-all hover:scale-105">
                      <Link href={
                        primaryIncomplete.mode === 'flashcard'
                          ? `/quiz/${primaryIncomplete.quizId}/session/${primaryIncomplete.activeSessionId || primaryIncomplete.id}/flashcard`
                          : `/quiz/${primaryIncomplete.quizId}/session/${primaryIncomplete.activeSessionId || primaryIncomplete.id}`
                      }>
                        Tiếp tục làm
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-2xl px-6 h-12 font-black border-2 border-gray-200 hover:border-[#5D7B6F] hover:bg-[#5D7B6F]/5 transition-all">
                      <Link href="/explore">
                        <Compass className="w-4 h-4 mr-2" />
                        Làm quiz mới
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Additional incomplete sessions indicator */}
                {incompleteSessions.length > 1 && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      + {incompleteSessions.length - 1} phiên học khác chưa hoàn thành
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          // No incomplete session - Show explore card
          <Card className="rounded-3xl border-none bg-white shadow-2xl shadow-[#5D7B6F]/10 overflow-hidden group relative">
            <CardContent className="p-0">
              <div className="relative p-8 md:p-10">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#5D7B6F]/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
                  {/* Icon */}
                  <div className="shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#5D7B6F]/10 to-[#5D7B6F]/5 flex items-center justify-center text-[#5D7B6F]">
                      <GraduationCap className="w-10 h-10" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
                      <span className="text-[10px] font-black text-green-600 uppercase tracking-wider">Sẵn sàng học tập</span>
                    </div>

                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">
                      Bắt đầu buổi học mới
                    </h2>

                    <p className="text-sm font-medium text-gray-500 max-w-lg">
                      Khám phá thư viện bộ đề hoặc tạo Quiz Trộn để kiểm tra kiến thức
                    </p>
                  </div>

                  {/* Action Button */}
                  <div className="w-full md:w-auto">
                    <Button asChild className="w-full md:w-auto rounded-2xl px-8 h-12 bg-[#5D7B6F] hover:bg-[#4a6358] font-black text-white shadow-xl shadow-[#5D7B6F]/20 transition-all hover:scale-105">
                      <Link href="/explore">
                        <Compass className="w-4 h-4 mr-2" />
                        Khám phá ngay
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Recent Activity ────────────────────────────────────────────────── */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Calendar className="w-5 h-5 text-[#5D7B6F]" />
              </div>
              <h2 className="text-xl font-black text-gray-900">Lịch sử làm bài</h2>
            </div>
            <Button variant="ghost" asChild className="text-[10px] font-black text-[#5D7B6F] uppercase tracking-widest hover:bg-[#5D7B6F]/5 rounded-xl">
              <Link href="/history">
                Xem tất cả <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="space-y-3">
            {!data?.recentActivities || data.recentActivities.length === 0 ? (
              <Card className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/50">
                <CardContent className="p-12 flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Chưa có hoạt động nào</p>
                    <p className="text-xs text-gray-400">Bắt đầu làm quiz để xem lịch sử tại đây</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              data.recentActivities.slice(0, 5).map((activity: any) => {
                const modeConfig = {
                  immediate: { icon: Zap, bg: 'bg-green-50', text: 'text-green-600', label: 'Luyện tập' },
                  review: { icon: BookOpen, bg: 'bg-blue-50', text: 'text-blue-600', label: 'Kiểm tra' },
                  flashcard: { icon: GraduationCap, bg: 'bg-purple-50', text: 'text-purple-600', label: 'Lật thẻ' },
                } as const
                const mode = (activity.mode ?? 'immediate') as keyof typeof modeConfig
                const { icon: ModeIcon, bg, text, label } = modeConfig[mode] ?? modeConfig.immediate

                // Mix quiz: if completed, allow redo by linking to quiz page
                const href = activity.status === 'active'
                  ? activity.mode === 'flashcard'
                    ? `/quiz/${activity.quizId}/session/${activity.activeSessionId || activity.id}/flashcard`
                    : `/quiz/${activity.quizId}/session/${activity.activeSessionId || activity.id}`
                  : `/history/${activity.quizId}/${activity.id}`

                // If user wants to "Làm lại" from history list, we usually go to the quiz page.
                // However, the current Link wraps the whole card and goes to /history (the result).
                // To support "Làm lại" directly from the dashboard, we might need a separate button.
                // But for now, ensuring they can "Làm lại" from the history detail page is a big step.
                // Let's refine the href to allow going to the quiz detail if we want a redo flow.

                return (
                  <div
                    key={activity.id}
                    onClick={() => {
                      if (!(activity.quizDeleted && !activity.isMix)) {
                        router.push(href)
                      }
                    }}
                    className={cn(
                      "block rounded-2xl bg-white border border-gray-100 p-5 transition-all hover:shadow-lg hover:border-[#5D7B6F]/20 hover:-translate-y-0.5 cursor-pointer",
                      activity.quizDeleted && !activity.isMix && 'opacity-50 cursor-not-allowed hover:translate-y-0'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                        activity.isMix ? "bg-[#5D7B6F]/10 text-[#5D7B6F]" :
                          activity.status === 'active' ? "bg-orange-50 text-orange-500" : cn(bg, text)
                      )}>
                        {activity.isMix ? <Shuffle className="w-6 h-6" /> : activity.status === 'active' ? <Play className="w-6 h-6" /> : <ModeIcon className="w-6 h-6" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-black text-gray-900 text-sm truncate uppercase tracking-tight">
                            {activity.quizCode}
                          </h3>
                          <span className={cn("text-[8px] font-black px-2 py-0.5 rounded-md uppercase", bg, text)}>
                            {label}
                          </span>
                          {activity.isMix && (
                            <span className="text-[8px] font-black bg-[#5D7B6F]/10 text-[#5D7B6F] px-2 py-0.5 rounded-md uppercase">
                              Quiz Trộn
                            </span>
                          )}
                          {activity.status === 'active' && (
                            <span className="text-[8px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md uppercase">
                              Đang làm
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {activity.categoryName} • {formatDistanceToNow(new Date(activity.activityAt), { addSuffix: true, locale: vi })}
                        </p>
                      </div>

                      {/* Score */}
                      <div className="text-right shrink-0">
                        {mode === 'flashcard' ? (
                          activity.status === 'active' ? (
                            <div>
                              <p className="text-lg font-black text-gray-300">--</p>
                              <p className="text-[8px] font-black text-gray-400 uppercase">
                                {activity.correctCount}/{activity.totalCount}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-lg font-black text-purple-600">
                                {activity.correctCount}
                                <span className="text-xs text-purple-400">/{activity.totalCount}</span>
                              </p>
                              <p className="text-[8px] font-black text-gray-400 uppercase">Đã biết</p>
                            </div>
                          )
                        ) : (
                          <div>
                            <p className={cn(
                              "text-lg font-black",
                              activity.status === 'active' ? "text-gray-300" : "text-[#5D7B6F]"
                            )}>
                              {activity.status === 'active' ? '--' : `${activity.score}/10`}
                            </p>
                            <p className="text-[8px] font-black text-gray-400 uppercase">
                              {activity.status === 'active'
                                ? `${activity.correctCount}/${activity.totalCount} ĐÃ LÀM`
                                : `${activity.correctCount}/${activity.totalCount}`}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Redo Action */}
                      {!activity.quizDeleted && (
                        <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0 ml-2">
                          <Button
                            variant="ghost"
                            className="h-8 rounded-lg px-3 hover:bg-[#5D7B6F]/5 text-[#5D7B6F] text-[10px] font-black uppercase tracking-widest transition-all"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link href={`/quiz/${activity.quizId}`} title="Làm lại bộ đề này (Giữ nguyên câu hỏi)">
                              Làm lại
                            </Link>
                          </Button>
                          {activity.isMix && (
                            <Button
                              variant="outline"
                              className="h-8 rounded-lg px-3 border-[#5D7B6F]/20 hover:bg-[#5D7B6F] hover:text-white text-[#5D7B6F] text-[10px] font-black uppercase tracking-widest transition-all"
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link href={`/explore?tab=mix&mix_from=${activity.quizId}`} title="Làm mới (Tạo bản trộn mới)">
                                Làm mới
                              </Link>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
