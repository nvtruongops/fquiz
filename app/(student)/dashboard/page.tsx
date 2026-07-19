'use client'

import { useState } from 'react'
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
  Bot,
  Sparkles,
  Map,
  Layers,
  BarChart2,
  LayoutDashboard,
  CheckCircle2,
  Award,
  Users,
} from 'lucide-react'
import { Card, CardContent } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/core/utils/cn'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useAuth } from '@/hooks/auth/useAuth'
import { API_ROUTES } from '@/lib/core/constants/api-routes'

export default function DashboardPage() {
  const router = useRouter()
  const { data: authData } = useAuth()
  const user = authData?.user ?? null
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'ai' | 'quiz'>('overview')

  const { data, isLoading } = useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.STUDENT.DASHBOARD}`)
      if (!res.ok) throw new Error('Failed to fetch dashboard data')
      return res.json()
    }
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-[#5D7B6F] animate-spin" />
        <p className="text-xs font-black text-[#5D7B6F] uppercase tracking-widest">Đang tải bảng điều khiển...</p>
      </div>
    )
  }

  // Find incomplete sessions (active sessions)
  const incompleteSessions = data?.recentActivities?.filter((a: any) =>
    a.status === 'active' && !a.quizDeleted
  ) || []

  // Get the most recent incomplete session
  const primaryIncomplete = incompleteSessions[0]
  const stats = data?.stats || { totalQuizzes: 0, averageScore: 0, totalCorrectAnswers: 0 }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F9F9F7] relative overflow-hidden">
      {/* Background Mesh Glow */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden transform-gpu -z-10">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#5D7B6F]/15 via-[#A4C3A2]/10 to-transparent blur-3xl opacity-40 transform-gpu" />
      </div>

      <div className="px-3 sm:px-6 md:px-10 w-full py-4 sm:py-8 space-y-4 sm:space-y-8 relative z-10">

        {/* ── Header & Sub-Tabs Navigation ──────────────────────────────── */}
        <header className="space-y-3 flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-6 border-b border-slate-200/60 pb-4 sm:pb-6">
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-center gap-1.5 text-[#5D7B6F]">
              <div className="h-2 w-2 rounded-full bg-[#5D7B6F] animate-ping" />
              <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.25em]">Bảng điều khiển FQuiz</p>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold text-gray-900 tracking-tight leading-snug">
              Chào {user?.name || 'bạn'}, hôm nay bạn muốn học gì?
            </h1>
          </div>

          {/* Sub-Tabs Switcher Bar */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 backdrop-blur-md rounded-xl sm:rounded-2xl border border-slate-300/60 shadow-inner w-full md:w-auto overflow-x-auto shrink-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setDashboardTab('overview')}
              className={cn(
                "flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex-1 sm:flex-none whitespace-nowrap",
                dashboardTab === 'overview'
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              )}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-[#5D7B6F] shrink-0" />
              Tổng quan
            </button>

            <button
              type="button"
              onClick={() => setDashboardTab('ai')}
              className={cn(
                "flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex-1 sm:flex-none whitespace-nowrap",
                dashboardTab === 'ai'
                  ? "bg-[#5D7B6F] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              )}
            >
              <Bot className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              Học AI
            </button>

            <button
              type="button"
              onClick={() => setDashboardTab('quiz')}
              className={cn(
                "flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex-1 sm:flex-none whitespace-nowrap",
                dashboardTab === 'quiz'
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              )}
            >
              <Zap className="w-3.5 h-3.5 text-blue-200 shrink-0" />
              Ôn Thi
            </button>
          </div>
        </header>

        {/* ── TAB 1: TỔNG QUAN (OVERVIEW) ─────────────────────────────────── */}
        {dashboardTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
            {/* Dual Service Quick Action Grid */}
            <section className="space-y-3 sm:space-y-4">
              <h2 className="text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.2em] text-[#5D7B6F]">
                Dịch vụ cốt lõi
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                {/* AI English Learning Card */}
                <Link
                  href="/roadmap"
                  className="group relative rounded-xl sm:rounded-[28px] p-4 sm:p-6 bg-gradient-to-br from-emerald-50/90 via-white/80 to-emerald-50/50 backdrop-blur-2xl border border-emerald-100/80 shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 bg-[#5D7B6F]/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none transform-gpu" />
                  <div className="relative z-10 space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#5D7B6F] text-white flex items-center justify-center shadow-xs">
                        <GraduationCap className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-[#5D7B6F] bg-white px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-xs border border-emerald-100">
                        AI Learning
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight group-hover:text-[#5D7B6F] transition-colors">
                        Lộ trình Tiếng Anh
                      </h3>
                      <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5 sm:mt-1">
                        Cây bài học theo trình độ, từ vựng & cấu trúc ngữ pháp AI.
                      </p>
                    </div>
                    <div className="pt-1 sm:pt-2 flex items-center gap-1 text-[11px] sm:text-xs font-bold text-[#5D7B6F]">
                      <span>Vào bài học</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>

                {/* Trợ Lý AI Ngôn Ngữ Card */}
                <Link
                  href="/ai"
                  className="group relative rounded-xl sm:rounded-[28px] p-4 sm:p-6 bg-gradient-to-br from-teal-50/90 via-white/80 to-cyan-50/50 backdrop-blur-2xl border border-teal-100/80 shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 bg-teal-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none transform-gpu" />
                  <div className="relative z-10 space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center shadow-xs">
                        <Sparkles className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-teal-600 bg-white px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-xs border border-teal-100">
                        AI Tools
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight group-hover:text-teal-600 transition-colors">
                        Trợ Lý AI Ngôn Ngữ
                      </h3>
                      <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5 sm:mt-1">
                        Tra từ vựng, phân tích ngữ pháp, dịch thuật & luyện viết AI.
                      </p>
                    </div>
                    <div className="pt-1 sm:pt-2 flex items-center gap-1 text-[11px] sm:text-xs font-bold text-teal-600">
                      <span>Mở trợ lý AI</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>

                {/* SRS Flashcards Review Card */}
                <Link
                  href="/flashcards"
                  className="group relative rounded-xl sm:rounded-[28px] p-4 sm:p-6 bg-gradient-to-br from-amber-50/90 via-white/80 to-amber-50/50 backdrop-blur-2xl border border-amber-100/80 shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none transform-gpu" />
                  <div className="relative z-10 space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                        <BookOpen className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-amber-600 bg-white px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-xs border border-amber-100">
                        FSRS SRS
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight group-hover:text-amber-600 transition-colors">
                        Ôn Flashcards
                      </h3>
                      <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5 sm:mt-1">
                        Thuật toán FSRS tính đường cong quên & gợi nhớ từ vựng.
                      </p>
                    </div>
                    <div className="pt-1 sm:pt-2 flex items-center gap-1 text-[11px] sm:text-xs font-bold text-amber-600">
                      <span>Ôn tập ngay</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>

                {/* Quiz & Exam Card */}
                <Link
                  href="/my-quizzes"
                  className="group relative rounded-xl sm:rounded-[28px] p-4 sm:p-6 bg-gradient-to-br from-blue-50/90 via-white/80 to-blue-50/50 backdrop-blur-2xl border border-blue-100/80 shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none transform-gpu" />
                  <div className="relative z-10 space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <Zap className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-blue-600 bg-white px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-xs border border-blue-100">
                        Quiz Exam
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                        Ôn Thi Trắc Nghiệm
                      </h3>
                      <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5 sm:mt-1">
                        Bộ đề thi cá nhân, thi thử chống gian lận & trộn đề ngẫu nhiên.
                      </p>
                    </div>
                    <div className="pt-1 sm:pt-2 flex items-center gap-1 text-[11px] sm:text-xs font-bold text-blue-600">
                      <span>Vào bộ đề</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>

                {/* Explore Categories & Exams Card */}
                <Link
                  href="/explore"
                  className="group relative rounded-xl sm:rounded-[28px] p-4 sm:p-6 bg-gradient-to-br from-purple-50/90 via-white/80 to-purple-50/50 backdrop-blur-2xl border border-purple-100/80 shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none transform-gpu" />
                  <div className="relative z-10 space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                        <Compass className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-purple-600 bg-white px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-xs border border-purple-100">
                        Explore
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight group-hover:text-purple-600 transition-colors">
                        Khám phá Môn học
                      </h3>
                      <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5 sm:mt-1">
                        Thư viện đề thi trắc nghiệm chia theo chuyên ngành & môn học.
                      </p>
                    </div>
                    <div className="pt-1 sm:pt-2 flex items-center gap-1 text-[11px] sm:text-xs font-bold text-purple-600">
                      <span>Khám phá ngay</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>

                {/* Community Discussion Card */}
                <Link
                  href="/community"
                  className="group relative rounded-xl sm:rounded-[28px] p-4 sm:p-6 bg-gradient-to-br from-indigo-50/90 via-white/80 to-purple-50/50 backdrop-blur-2xl border border-indigo-100/80 shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none transform-gpu" />
                  <div className="relative z-10 space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs">
                        <Users className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-indigo-600 bg-white px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-xs border border-indigo-100">
                        Community
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                        Cộng Đồng Thảo Luận
                      </h3>
                      <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5 sm:mt-1">
                        Hỏi đáp bài tập, trao đổi đề thi & chia sẻ kinh nghiệm học tập.
                      </p>
                    </div>
                    <div className="pt-1 sm:pt-2 flex items-center gap-1 text-[11px] sm:text-xs font-bold text-indigo-600">
                      <span>Vào cộng đồng</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </div>
            </section>
          </div>
        )}

        {/* ── TAB 2: HỌC NGÔN NGỮ AI ─────────────────────────────────────── */}
        {dashboardTab === 'ai' && (
          <div className="space-y-4 sm:space-y-8 animate-in fade-in duration-300">
            {/* AI Banner */}
            <div className="relative overflow-hidden rounded-xl sm:rounded-[32px] bg-gradient-to-r from-[#5D7B6F] to-[#3f574d] p-4 sm:p-8 md:p-10 text-white shadow-lg shadow-[#5D7B6F]/15 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
              <div className="relative z-10 space-y-2 sm:space-y-3 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-white/20 backdrop-blur-md text-emerald-100 border border-white/20 uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300" /> AI Language Sub-System
                  </span>
                  {user?.role !== 'dev' && (
                    <span className="text-[8.5px] sm:text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-200 border border-amber-300/40">
                      Coming Soon
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl md:text-4xl font-extrabold tracking-tight">Học Ngôn Ngữ AI & Ghi Nhớ FSRS</h2>
                <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-medium">
                  Trợ lý AI phân tích ngữ pháp, xây dựng từ vựng, kịch bản hội thoại và tạo lộ trình bài học cá nhân hóa theo các khung trình độ quốc tế (CEFR, JLPT, HSK, TOPIK).
                </p>
              </div>
              <div className="relative z-10 shrink-0">
                <Button asChild className="bg-white text-[#5D7B6F] hover:bg-emerald-50 font-bold rounded-xl sm:rounded-2xl text-xs shadow-xs h-9 sm:h-10 cursor-pointer">
                  <Link href="/ai">
                    Mở Trợ Lý AI <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* AI Tools Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Link href="/ai" className="group p-4 sm:p-6 rounded-xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-[#5D7B6F] transition-all space-y-2 sm:space-y-3">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-[#5D7B6F] flex items-center justify-center font-bold group-hover:bg-[#5D7B6F] group-hover:text-white transition-colors">
                  <Bot className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Trợ Lý AI Ngôn Ngữ</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">Phân tích từ vựng, ngữ pháp, kịch bản hội thoại & câu chuyện AI.</p>
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-[#5D7B6F] flex items-center gap-1 pt-1">
                  <span>Trải nghiệm ngay</span> <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>

              <Link href="/roadmap" className="group p-4 sm:p-6 rounded-xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-[#5D7B6F] transition-all space-y-2 sm:space-y-3">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold group-hover:bg-teal-600 group-hover:text-white transition-colors">
                  <Map className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Lộ Trình Bài Học</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">Sơ đồ kỹ năng theo cấp độ từ A1-C2, JLPT, HSK tự động phát triển.</p>
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-teal-600 flex items-center gap-1 pt-1">
                  <span>Xem lộ trình</span> <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>

              <Link href="/flashcards" className="group p-4 sm:p-6 rounded-xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-amber-500 transition-all space-y-2 sm:space-y-3">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <Layers className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Flashcards FSRS</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">Thẻ ghi nhớ thông minh tính toán tối ưu khoảng thời gian lặp lại SRS.</p>
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-amber-600 flex items-center gap-1 pt-1">
                  <span>Ôn tập ngay</span> <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>

              <Link href="/analytics" className="group p-4 sm:p-6 rounded-xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-purple-500 transition-all space-y-2 sm:space-y-3">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <BarChart2 className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Phân Tích Tiến Độ</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">Biểu đồ dự đoán mức độ ghi nhớ từ vựng & năng lực ngôn ngữ.</p>
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-purple-600 flex items-center gap-1 pt-1">
                  <span>Xem báo cáo</span> <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* ── TAB 3: ÔN THI TRẮC NGHIỆM ───────────────────────────────────── */}
        {dashboardTab === 'quiz' && (
          <div className="space-y-4 sm:space-y-8 animate-in fade-in duration-300">
            {/* Exam Banner */}
            <div className="relative overflow-hidden rounded-xl sm:rounded-[32px] bg-gradient-to-r from-blue-700 to-indigo-800 p-4 sm:p-8 md:p-10 text-white shadow-lg shadow-blue-600/15 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
              <div className="relative z-10 space-y-2 sm:space-y-3 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-white/20 backdrop-blur-md text-blue-100 border border-white/20 uppercase tracking-wider">
                  <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-200" /> Quiz & Exam System
                </span>
                <h2 className="text-xl sm:text-2xl md:text-4xl font-extrabold tracking-tight">Ôn Thi & Luyện Đề Trắc Nghiệm</h2>
                <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-medium">
                  Thi thử trực tuyến chống gian lận, tự động chấm điểm, tạo bộ đề thi trộn ngẫu nhiên và lưu trữ ngân hàng câu hỏi.
                </p>
              </div>
              <div className="relative z-10 flex flex-wrap gap-2 sm:gap-3 shrink-0">
                <Button asChild className="bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl sm:rounded-2xl text-xs shadow-xs h-9 sm:h-10 cursor-pointer">
                  <Link href="/my-quizzes">
                    Bộ Đề Của Tôi <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="bg-white/10 hover:bg-white/20 border-white/30 text-white font-bold rounded-xl sm:rounded-2xl text-xs backdrop-blur-md h-9 sm:h-10 cursor-pointer">
                  <Link href="/explore">
                    Khám Phá Đề Công Khai
                  </Link>
                </Button>
              </div>
            </div>

            {/* Exam Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
              <div className="bg-white p-3.5 sm:p-6 rounded-xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-1 sm:space-y-2">
                <span className="text-[9px] sm:text-xs font-extrabold uppercase text-slate-400 truncate block">Đã hoàn thành</span>
                <p className="text-base sm:text-2xl font-extrabold text-slate-900 truncate">{stats.totalQuizzes || 0} bài thi</p>
              </div>
              <div className="bg-white p-3.5 sm:p-6 rounded-xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-1 sm:space-y-2">
                <span className="text-[9px] sm:text-xs font-extrabold uppercase text-slate-400 truncate block">Điểm trung bình</span>
                <p className="text-base sm:text-2xl font-extrabold text-blue-600 truncate">{Number(stats.averageScore || 0).toFixed(1)} / 10</p>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-white p-3.5 sm:p-6 rounded-xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-1 sm:space-y-2">
                <span className="text-[9px] sm:text-xs font-extrabold uppercase text-slate-400 truncate block">Câu trả lời đúng</span>
                <p className="text-base sm:text-2xl font-extrabold text-emerald-600 truncate">{stats.totalCorrectAnswers || 0} câu</p>
              </div>
            </div>

            {/* Recent Exam Activities */}
            <section className="space-y-4">
              <h3 className="text-lg font-black text-slate-900">Lịch sử thi trắc nghiệm gần nhất</h3>
              <div className="space-y-3">
                {!data?.recentActivities || data.recentActivities.length === 0 ? (
                  <Card className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-400 text-xs font-semibold">
                    Chưa có lịch sử làm bài trắc nghiệm nào.
                  </Card>
                ) : (
                  data.recentActivities.slice(0, 5).map((activity: any) => (
                    <ActivityItem key={activity.id} activity={activity} router={router} />
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function ActivityItem({ activity, router }: { activity: any; router: any }) {
  const modeConfig = {
    immediate: { icon: Zap, bg: 'bg-green-50', text: 'text-green-600', label: 'Luyện tập' },
    review: { icon: BookOpen, bg: 'bg-blue-50', text: 'text-blue-600', label: 'Kiểm tra' },
    flashcard: { icon: GraduationCap, bg: 'bg-purple-50', text: 'text-purple-600', label: 'Lật thẻ' },
  } as const
  const mode = (activity.mode ?? 'immediate') as keyof typeof modeConfig
  const { icon: ModeIcon, bg, text, label } = modeConfig[mode] ?? modeConfig.immediate

  const href = activity.status === 'active'
    ? activity.mode === 'flashcard'
      ? `/quiz/${activity.quizId}/session/${activity.activeSessionId || activity.id}/flashcard`
      : `/quiz/${activity.quizId}/session/${activity.activeSessionId || activity.id}`
    : `/history/${activity.quizId}/${activity.id}`

  const isDisabled = activity.quizDeleted && !activity.isMix

  return (
    <div
      onClick={() => {
        if (!isDisabled) {
          router.push(href)
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (!isDisabled) {
            router.push(href)
          }
        }
      }}
      className={cn(
        "block rounded-xl sm:rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 p-3 sm:p-5 transition-all shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(93,123,111,0.08)] cursor-pointer",
        isDisabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full">
          <div className={cn(
            "w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-xs",
            activity.isMix ? "bg-[#5D7B6F]/10 text-[#5D7B6F]" :
              activity.status === 'active' ? "bg-orange-50 text-orange-500" : cn(bg, text)
          )}>
            {activity.isMix ? <Shuffle className="w-4 h-4 sm:w-6 sm:h-6" /> : activity.status === 'active' ? <Play className="w-4 h-4 sm:w-6 sm:h-6" /> : <ModeIcon className="w-4 h-4 sm:w-6 sm:h-6" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mb-0.5 sm:mb-1">
              <h3 className="font-extrabold text-gray-900 text-xs sm:text-sm uppercase tracking-tight truncate max-w-[130px] sm:max-w-none">
                {activity.quizCode}
              </h3>
              <div className="flex flex-wrap gap-1">
                <span className={cn("text-[7.5px] sm:text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase", bg, text)}>
                  {label}
                </span>
                {activity.isMix && (
                  <span className="text-[7.5px] sm:text-[8px] font-extrabold bg-[#5D7B6F]/10 text-[#5D7B6F] px-1.5 py-0.5 rounded uppercase">
                    Mix
                  </span>
                )}
                {activity.status === 'active' && (
                  <span className="text-[7.5px] sm:text-[8px] font-extrabold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded uppercase">
                    Đang làm
                  </span>
                )}
              </div>
            </div>
            <p className="text-[9.5px] sm:text-[10px] text-gray-500 truncate">
              {activity.categoryName} • {formatDistanceToNow(new Date(activity.activityAt), { addSuffix: true, locale: vi })}
            </p>
          </div>

          <div className="text-right shrink-0">
            {mode === 'flashcard' ? (
              activity.status === 'active' ? (
                <div>
                  <p className="text-base sm:text-lg font-extrabold text-gray-300">--</p>
                  <p className="text-[7.5px] sm:text-[8px] font-extrabold text-gray-400 uppercase">
                    {activity.correctCount}/{activity.totalCount}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-base sm:text-lg font-extrabold text-purple-600">
                    {activity.correctCount}
                    <span className="text-xs text-purple-400">/{activity.totalCount}</span>
                  </p>
                  <p className="text-[7.5px] sm:text-[8px] font-extrabold text-gray-400 uppercase">Đã biết</p>
                </div>
              )
            ) : (
              <div>
                <p className={cn(
                  "text-base sm:text-lg font-extrabold",
                  activity.status === 'active' ? "text-gray-300" : "text-[#5D7B6F]"
                )}>
                  {activity.status === 'active' ? '--' : `${activity.score}/10`}
                </p>
                <p className="text-[7.5px] sm:text-[8px] font-extrabold text-gray-400 uppercase">
                  {activity.status === 'active'
                    ? `Tiến độ: ${activity.correctCount}/${activity.totalCount}`
                    : `Đúng: ${activity.correctCount}/${activity.totalCount}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {!activity.quizDeleted && (
          <div className="flex items-center gap-1.5 w-full sm:w-auto mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-none border-gray-50">
            <Button
              variant="ghost"
              className="flex-1 sm:flex-none h-7 sm:h-9 rounded-lg sm:rounded-xl px-3 sm:px-4 hover:bg-[#5D7B6F]/5 text-[#5D7B6F] text-[9.5px] sm:text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={mode === 'flashcard' ? `/quiz/${activity.quizId}?selectMode=true&mode=flashcard` : `/quiz/${activity.quizId}`} title="Làm lại bộ đề này">
                Làm lại
              </Link>
            </Button>
            {activity.isMix && (
              <Button
                variant="outline"
                className="flex-1 sm:flex-none h-7 sm:h-9 rounded-lg sm:rounded-xl px-3 sm:px-4 border-[#5D7B6F]/20 hover:bg-[#5D7B6F] hover:text-white text-[#5D7B6F] text-[9.5px] sm:text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <Link href={`/?tab=mix&mix_from=${activity.quizId}`} title="Làm mới (Tạo bản trộn mới)">
                  Làm mới
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
