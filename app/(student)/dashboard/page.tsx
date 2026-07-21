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
  BookOpen,
  Bot,
  Sparkles,
  Map,
  Layers,
  BarChart3,
  LayoutDashboard,
  Users,
  MessageSquare,
  Plus,
  Flame,
  CheckCircle2,
  FileText,
  Award,
  Target,
  ChevronRight,
  TrendingUp,
  HelpCircle,
  Search,
  Compass,
  Sparkle,
  Bookmark
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
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'ai' | 'quiz' | 'community'>('overview')
  const [searchQuery, setSearchQuery] = useState('')

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <div className="w-full h-full flex flex-col justify-between space-y-2 font-sans text-slate-800 overflow-hidden">
      {/* Subtle Ambient Background Decorative Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-10 -right-10 w-80 h-80 bg-[#5D7B6F]/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-1/2 -left-10 w-72 h-72 bg-[#A4C3A2]/15 rounded-full blur-3xl opacity-40" />
        <div className="absolute -bottom-10 right-1/3 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl opacity-30" />
      </div>

      {/* ── TOP HERO HEADER & SUB-NAVIGATION ────────────────────────────── */}
      <header className="relative shrink-0 overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-[#2A3B34] px-3 py-1.5 text-white shadow-xs border border-slate-700/50">
        <div className="relative z-10 flex items-center justify-between gap-3">
          
          {/* Compact User Profile & Welcome */}
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-7.5 w-7.5 ring-2 ring-[#A4C3A2]/30 shadow-xs shrink-0">
              {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user?.name || 'User'} />}
              <AvatarFallback className="bg-gradient-to-br from-[#5D7B6F] to-[#2A3B34] text-white font-black text-[11px]">
                {userInitial}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-black tracking-tight text-white truncate">
                Xin chào, {user?.name || 'Học viên'}! 👋
              </h1>
              <Badge className="bg-[#5D7B6F]/40 text-[#A4C3A2] border border-[#5D7B6F]/50 px-1.5 py-0 text-[8px] font-extrabold uppercase rounded-full shrink-0">
                Student Member
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* ── IN-PROGRESS SESSION ALERT BANNER ──────────────────────── */}
      {primaryIncomplete && (
        <div className="shrink-0 overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-0.5 shadow-sm">
          <div className="bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-[10px] text-white flex items-center justify-between gap-3 border border-amber-500/30">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-xs">
                <Flame className="w-3.5 h-3.5 text-slate-950 animate-bounce" />
              </div>
              <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0">
                Đang dở dang
              </Badge>
              <h3 className="text-xs sm:text-sm font-black text-white truncate tracking-tight">
                {primaryIncomplete.quizCode} — {primaryIncomplete.quizTitle}
              </h3>
            </div>

            <Button asChild size="sm" className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-black rounded-lg text-xs h-7 px-3 cursor-pointer shrink-0 shadow-xs transition-all">
              <Link href={
                primaryIncomplete.mode === 'flashcard'
                  ? `/quiz/${primaryIncomplete.quizId}/session/${primaryIncomplete.activeSessionId || primaryIncomplete.id}/flashcard`
                  : `/quiz/${primaryIncomplete.quizId}/session/${primaryIncomplete.activeSessionId || primaryIncomplete.id}`
              }>
                Tiếp tục ngay <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* ── STATS SUMMARY HORIZONTAL BAR ──────────────────────────────── */}
      {dashboardTab === 'overview' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <div className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-9.5 h-9.5 rounded-xl bg-[#5D7B6F]/10 text-[#5D7B6F] flex items-center justify-center shrink-0 border border-[#5D7B6F]/20 shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[10.5px] font-black uppercase text-slate-400 block tracking-wider truncate">Đã Hoàn Thành</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-base sm:text-lg font-black text-slate-900 leading-none">{stats.totalQuizzes || 0}</span>
                <span className="text-[10.5px] sm:text-xs text-slate-500 font-extrabold">bài tập</span>
              </div>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-9.5 h-9.5 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/60 shadow-2xs">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[10.5px] font-black uppercase text-slate-400 block tracking-wider truncate">Điểm Trung Bình</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-base sm:text-lg font-black text-blue-600 leading-none">{avgScoreNum.toFixed(1)}</span>
                <span className="text-[10.5px] sm:text-xs text-slate-500 font-extrabold">/ 10</span>
              </div>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-9.5 h-9.5 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/60 shadow-2xs">
              <Target className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[10.5px] font-black uppercase text-slate-400 block tracking-wider truncate">Câu Đúng</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-base sm:text-lg font-black text-emerald-600 leading-none">{stats.totalCorrectAnswers || 0}</span>
                <span className="text-[10.5px] sm:text-xs text-slate-500 font-extrabold">câu hỏi</span>
              </div>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400 uppercase font-black tracking-wider text-[10px] sm:text-[10.5px]">Hoàn Thiện</span>
              <span className="text-purple-600 font-black text-sm sm:text-base">{Math.min(Math.round(avgScoreNum * 10), 100)}%</span>
            </div>
            <Progress value={Math.min(avgScoreNum * 10, 100)} className="h-2.5 bg-slate-100 mt-1.5 rounded-full" />
          </div>
        </div>
      )}

      {/* ── TAB 1: TỔNG QUAN — PERFECTLY PROPORTIONED EXPANDED BENTO ── */}
      {dashboardTab === 'overview' && (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 w-full items-stretch overflow-hidden">
          
          {/* LEFT 8 COLS: 3 Perfectly Scaled Bento Cards */}
          <div className="lg:col-span-8 h-full min-h-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 h-full min-h-0">

              {/* PILLAR 1: HỌC NGÔN NGỮ AI */}
              <div className="group relative overflow-hidden rounded-xl p-3.5 bg-gradient-to-br from-[#5D7B6F] via-[#3f574d] to-slate-900 text-white shadow-xs border border-emerald-500/30 flex flex-col justify-between space-y-2.5">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-7.5 h-7.5 rounded-lg bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                      <Bot className="w-4 h-4 text-amber-300" />
                    </div>
                    <Badge className="bg-white/20 text-emerald-100 border border-white/20 px-2.5 py-0.5 text-[9.5px] font-black uppercase rounded-full">
                      Học AI
                    </Badge>
                  </div>

                  <div>
                    <h2 className="text-base font-black text-white group-hover:text-amber-200 transition-colors">Học Ngôn Ngữ AI</h2>
                    <p className="text-[11px] sm:text-xs text-emerald-100/90 leading-snug mt-0.5">
                      Trợ lý tra từ thông minh & lặp lại ngắt quãng FSRS.
                    </p>
                  </div>

                  <div className="space-y-2 text-[11px] sm:text-xs font-semibold text-emerald-100/95 pt-0.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>Tra từ & ngữ pháp với AI</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>Lộ trình bài học CEFR, JLPT, HSK</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>Thuật toán ghi nhớ SRS / FSRS v4</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>Ghi nhớ ngắt quãng & độ phủ</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 shrink-0">
                  <Button asChild size="sm" className="bg-white text-[#5D7B6F] hover:bg-emerald-50 font-black text-xs h-8 rounded-xl shadow-xs transition-all active:scale-[0.98] shrink-0">
                    <Link href="/ai">Mở AI <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold text-xs h-8 rounded-xl transition-all active:scale-[0.98] shrink-0">
                    <Link href="/roadmap">Lộ trình</Link>
                  </Button>
                </div>
              </div>

              {/* PILLAR 2: ÔN THI TRẮC NGHIỆM */}
              <div className="group relative overflow-hidden rounded-xl p-3.5 bg-gradient-to-br from-indigo-700 via-blue-800 to-slate-900 text-white shadow-xs border border-blue-500/30 flex flex-col justify-between space-y-2.5">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-7.5 h-7.5 rounded-lg bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                      <Zap className="w-4 h-4 text-blue-200" />
                    </div>
                    <Badge className="bg-white/20 text-blue-100 border border-white/20 px-2.5 py-0.5 text-[9.5px] font-black uppercase rounded-full">
                      Quiz Engine
                    </Badge>
                  </div>

                  <div>
                    <h2 className="text-base font-black text-white group-hover:text-blue-200 transition-colors">Ôn Thi Trắc Nghiệm</h2>
                    <p className="text-[11px] sm:text-xs text-blue-100/90 leading-snug mt-0.5">
                      Động cơ làm bài đa chế độ: Chấm ngay & Lật thẻ.
                    </p>
                  </div>

                  <div className="space-y-2 text-[11px] sm:text-xs font-semibold text-blue-100/95 pt-0.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-300 shrink-0" />
                      <span>Luyện tập: Chấm ngay & Lật thẻ</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-300 shrink-0" />
                      <span>Mix Quiz trộn câu hỏi tự động</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-300 shrink-0" />
                      <span>Ngân hàng đề thi môn học chuẩn</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-300 shrink-0" />
                      <span>Báo cáo điểm & thời gian thi</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 shrink-0">
                  <Button asChild size="sm" className="bg-white text-blue-900 hover:bg-blue-50 font-black text-xs h-8 rounded-xl shadow-xs transition-all active:scale-[0.98] shrink-0">
                    <Link href="/my-quizzes">Bộ đề tôi <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold text-xs h-8 rounded-xl transition-all active:scale-[0.98] shrink-0">
                    <Link href="/explore">Khám phá</Link>
                  </Button>
                </div>
              </div>

              {/* PILLAR 3: CỘNG ĐỒNG HỌC TẬP */}
              <div className="group relative overflow-hidden rounded-xl p-3.5 bg-gradient-to-br from-purple-700 via-violet-800 to-indigo-950 text-white shadow-xs border border-purple-500/30 flex flex-col justify-between space-y-2.5">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-7.5 h-7.5 rounded-lg bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                      <Users className="w-4 h-4 text-purple-200" />
                    </div>
                    <Badge className="bg-white/20 text-purple-100 border border-white/20 px-2.5 py-0.5 text-[9.5px] font-black uppercase rounded-full">
                      Cộng Đồng
                    </Badge>
                  </div>

                  <div>
                    <h2 className="text-base font-black text-white group-hover:text-purple-200 transition-colors">Cộng Đồng Học Tập</h2>
                    <p className="text-[11px] sm:text-xs text-purple-100/90 leading-snug mt-0.5">
                      Diễn đàn thảo luận sinh viên: Hỏi đáp bài tập.
                    </p>
                  </div>

                  <div className="space-y-2 text-[11px] sm:text-xs font-semibold text-purple-100/95 pt-0.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-300 shrink-0" />
                      <span>Hỏi bài khó + AI tự động đáp</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-300 shrink-0" />
                      <span>Chia sẻ bộ đề & kinh nghiệm thi</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-300 shrink-0" />
                      <span>Bình luận & thảo luận sinh viên</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-300 shrink-0" />
                      <span>Thả tim & tương tác bài viết</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 shrink-0">
                  <Button asChild size="sm" className="bg-white text-purple-900 hover:bg-purple-50 font-black text-xs h-8 rounded-xl shadow-xs transition-all active:scale-[0.98] shrink-0">
                    <Link href="/community">Diễn đàn <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold text-xs h-8 rounded-xl transition-all active:scale-[0.98] shrink-0">
                    <Link href="/community?action=new">Đăng bài</Link>
                  </Button>
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT 4 COLS: Activity Timeline (Matching full height of left column) */}
          <div className="lg:col-span-4 h-full min-h-0 flex flex-col justify-between overflow-hidden">
            <div className="h-full min-h-0 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-2 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 shrink-0">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#5D7B6F] flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" /> Vừa Thực Hiện
                </h3>
                <Link href="/history" className="text-[10.5px] font-bold text-slate-400 hover:text-[#5D7B6F] transition-colors">
                  Xem tất cả
                </Link>
              </div>

              <div className="space-y-1 overflow-y-auto flex-1 min-h-0 pr-0.5 scrollbar-thin">
                {!recentActivities || recentActivities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-8 sm:py-10 gap-2 h-full my-auto">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100/80 flex items-center justify-center text-slate-400 mb-1 border border-slate-200/60 shadow-2xs">
                      <HelpCircle className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 font-bold italic">Chưa có hoạt động gần đây.</p>
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
      )}

      {/* ── TAB 2: HỌC NGÔN NGỮ AI ─────────────────────────────────────── */}
      {dashboardTab === 'ai' && (
        <div className="flex-1 min-h-0 flex flex-col justify-between gap-2.5 pt-0.5 overflow-y-auto">
          <div className="rounded-xl bg-gradient-to-r from-[#5D7B6F] via-teal-800 to-slate-900 p-3 text-white shadow-xs flex items-center justify-between gap-3 shrink-0 border border-emerald-500/30">
            <div>
              <span className="text-[9.5px] font-black bg-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                AI Language Studio
              </span>
              <h2 className="text-sm sm:text-base font-black tracking-tight mt-1">Học Ngôn Ngữ AI & Ghi Nhớ FSRS</h2>
              <p className="text-xs text-emerald-100/90 mt-0.5">Kịch bản bài học, tra từ thông minh & tối ưu lặp lại ngắt quãng.</p>
            </div>
            <Button asChild size="sm" className="bg-white text-[#5D7B6F] hover:bg-emerald-50 font-black text-xs rounded-xl h-8 px-3.5 cursor-pointer shrink-0 shadow-xs">
              <Link href="/ai">Mở AI Chat <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 flex-1 min-h-0">
            <Link href="/ai" className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-[#5D7B6F] transition-all flex flex-col justify-between space-y-2 group">
              <div className="w-7.5 h-7.5 rounded-lg bg-emerald-50 text-[#5D7B6F] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-[#5D7B6F]">Trợ Lý AI Ngôn Ngữ</h3>
                <p className="text-[10.5px] sm:text-xs text-slate-500 font-semibold leading-snug">Phân tích từ vựng & kịch bản ngữ pháp AI.</p>
              </div>
              <span className="text-xs font-black text-[#5D7B6F] flex items-center gap-1 pt-1 shrink-0">
                Bắt đầu <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>

            <Link href="/roadmap" className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-teal-600 transition-all flex flex-col justify-between space-y-2 group">
              <div className="w-7.5 h-7.5 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <Map className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-teal-700">Lộ Trình Bài Học</h3>
                <p className="text-[10.5px] sm:text-xs text-slate-500 font-semibold leading-snug">CEFR, JLPT, HSK theo cấp độ.</p>
              </div>
              <span className="text-xs font-black text-teal-600 flex items-center gap-1 pt-1 shrink-0">
                Xem sơ đồ <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>

            <Link href="/flashcards" className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-amber-500 transition-all flex flex-col justify-between space-y-2 group">
              <div className="w-7.5 h-7.5 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-amber-700">Flashcards FSRS</h3>
                <p className="text-[10.5px] sm:text-xs text-slate-500 font-semibold leading-snug">Thuật toán lặp lại ngắt quãng SRS.</p>
              </div>
              <span className="text-xs font-black text-amber-600 flex items-center gap-1 pt-1 shrink-0">
                Ôn từ ngay <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>

            <Link href="/history" className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-purple-500 transition-all flex flex-col justify-between space-y-2 group">
              <div className="w-7.5 h-7.5 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-purple-700">Nhật Ký Học AI</h3>
                <p className="text-[10.5px] sm:text-xs text-slate-500 font-semibold leading-snug">Lịch sử học tập & độ phủ từ vựng.</p>
              </div>
              <span className="text-xs font-black text-purple-600 flex items-center gap-1 pt-1 shrink-0">
                Xem chi tiết <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* ── TAB 3: ÔN THI TRẮC NGHIỆM ───────────────────────────────────── */}
      {dashboardTab === 'quiz' && (
        <div className="flex-1 min-h-0 flex flex-col justify-between gap-2.5 pt-0.5 overflow-y-auto">
          <div className="rounded-xl bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 p-3 text-white shadow-xs flex items-center justify-between gap-3 shrink-0 border border-blue-500/30">
            <div>
              <span className="text-[9.5px] font-black bg-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Exam Prep Hub
              </span>
              <h2 className="text-sm sm:text-base font-black tracking-tight mt-1">Ôn Thi & Luyện Đề Trắc Nghiệm</h2>
              <p className="text-xs text-blue-100/90 mt-0.5">Luyện tập đa chế độ: Chấm ngay, lật thẻ & Mix Quiz ngẫu nhiên.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button asChild size="sm" className="bg-white text-blue-900 hover:bg-blue-50 font-black text-xs rounded-xl h-8 px-3.5 cursor-pointer shadow-xs">
                <Link href="/my-quizzes">Bộ Đề Tôi <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 border-white/30 text-white font-bold text-xs rounded-xl h-8 px-3.5 cursor-pointer">
                <Link href="/explore">Khám phá</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0">
            <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-7.5 h-7.5 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Hoàn thành</span>
                <p className="text-xs sm:text-sm font-black text-slate-900">{stats.totalQuizzes || 0} bài thi</p>
              </div>
            </div>

            <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-7.5 h-7.5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Trung bình</span>
                <p className="text-xs sm:text-sm font-black text-blue-600">{avgScoreNum.toFixed(1)} / 10</p>
              </div>
            </div>

            <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-7.5 h-7.5 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Câu đúng</span>
                <p className="text-xs sm:text-sm font-black text-emerald-600">{stats.totalCorrectAnswers || 0} câu</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-2 flex-1 min-h-0 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Lịch sử bài thi gần nhất</h3>
              <Link href="/history" className="text-xs font-bold text-blue-600 hover:underline">Tất cả</Link>
            </div>
            <div className="space-y-1.5">
              {recentActivities.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-3 text-center">Chưa có bài thi nào.</p>
              ) : (
                recentActivities.slice(0, 5).map((act: any) => (
                  <CompactActivityItem key={act.id} activity={act} router={router} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: CỘNG ĐỒNG HỌC TẬP ───────────────────────────────────── */}
      {dashboardTab === 'community' && (
        <div className="flex-1 min-h-0 flex flex-col justify-between gap-2.5 pt-0.5 overflow-y-auto">
          <div className="rounded-xl bg-gradient-to-r from-purple-700 via-indigo-800 to-slate-900 p-3 text-white shadow-xs flex items-center justify-between gap-3 shrink-0 border border-purple-500/30">
            <div>
              <span className="text-[9.5px] font-black bg-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Community Forum
              </span>
              <h2 className="text-sm sm:text-base font-black tracking-tight mt-1">Thảo Luận & Chia Sẻ Kiến Thức</h2>
              <p className="text-xs text-purple-100/90 mt-0.5">Đặt câu hỏi bài tập khó & chia sẻ mẹo thi hiệu quả.</p>
            </div>
            <Button asChild size="sm" className="bg-white text-purple-900 hover:bg-purple-50 font-black text-xs rounded-xl h-8 px-3.5 cursor-pointer shrink-0 shadow-xs">
              <Link href="/community">Vào Cộng Đồng <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 min-h-0">
            <Link href="/community" className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-purple-600 transition-all flex flex-col justify-between space-y-2 group">
              <div className="w-7.5 h-7.5 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-purple-700">Hỏi Đáp Bài Tập</h3>
                <p className="text-[10.5px] sm:text-xs text-slate-500 font-semibold leading-snug">Đăng thắc mắc & nhận câu trả lời AI.</p>
              </div>
              <span className="text-xs font-black text-purple-600 flex items-center gap-1 pt-1 shrink-0">
                Xem diễn đàn <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>

            <Link href="/community" className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-indigo-600 transition-all flex flex-col justify-between space-y-2 group">
              <div className="w-7.5 h-7.5 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-indigo-700">Chia Sẻ Mẹo Học</h3>
                <p className="text-[10.5px] sm:text-xs text-slate-500 font-semibold leading-snug">Kinh nghiệm đạt điểm cao bài thi.</p>
              </div>
              <span className="text-xs font-black text-indigo-600 flex items-center gap-1 pt-1 shrink-0">
                Đọc bài viết <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>

            <Link href="/community?action=new" className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-violet-600 transition-all flex flex-col justify-between space-y-2 group">
              <div className="w-7.5 h-7.5 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-violet-700">Tạo Bài Viết Mới</h3>
                <p className="text-[10.5px] sm:text-xs text-slate-500 font-semibold leading-snug">Đóng góp ý kiến cho cộng đồng.</p>
              </div>
              <span className="text-xs font-black text-violet-600 flex items-center gap-1 pt-1 shrink-0">
                Tạo mới <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>
        </div>
      )}

    </div>
  )
}

function CompactActivityItem({ activity, router }: { activity: any; router: any }) {
  const href = activity.status === 'active'
    ? activity.mode === 'flashcard'
      ? `/quiz/${activity.quizId}/session/${activity.activeSessionId || activity.id}/flashcard`
      : `/quiz/${activity.quizId}/session/${activity.activeSessionId || activity.id}`
    : `/quiz/${activity.quizId}/result/${activity.id}`

  const isCompleted = activity.status === 'completed'
  const isFlashcard = activity.mode === 'flashcard'

  return (
    <div
      onClick={() => router.push(href)}
      className="group flex items-center justify-between gap-2.5 p-2 rounded-xl bg-slate-50/90 hover:bg-slate-100/90 transition-all cursor-pointer border border-slate-200/60 shadow-2xs"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={cn(
          "w-6.5 h-6.5 rounded-lg flex items-center justify-center shrink-0 text-xs font-black shadow-2xs",
          isFlashcard ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
        )}>
          {isFlashcard ? <Layers className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black text-slate-900 truncate group-hover:text-[#5D7B6F] tracking-tight">
            {activity.quizCode} — {activity.quizTitle || activity.categoryName}
          </p>
          <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400 mt-0.5">
            <span>{formatDistanceToNow(new Date(activity.activityAt), { addSuffix: true, locale: vi })}</span>
            <span>•</span>
            <span className="capitalize">{activity.mode}</span>
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        {isCompleted ? (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9.5px] font-black px-2 py-0.5 rounded-md">
            {activity.score}/10
          </Badge>
        ) : (
          <Badge className="bg-amber-50 text-orange-600 border-amber-200 text-[9.5px] font-black px-2 py-0.5 rounded-md animate-pulse">
            Đang làm
          </Badge>
        )}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="w-full h-full flex flex-col space-y-2 font-sans p-1">
      <div className="flex items-center justify-between p-2.5 bg-white/80 rounded-xl border border-slate-200/80">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-6 w-48 rounded-lg" />
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 flex-1 min-h-0">
        <div className="lg:col-span-8 flex flex-col gap-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </div>
          <Skeleton className="flex-1 rounded-xl" />
        </div>
        <div className="lg:col-span-4">
          <Skeleton className="h-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
