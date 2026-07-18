'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Map, Layers, TrendingUp, Compass, FileText, History, LayoutDashboard, ChevronDown, Menu, X, Sparkles, Bot } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import { UserDropdown } from '@/components/layout/UserDropdown'
import { MobileNav } from '@/components/layout/MobileNav'
import { useAuth } from '@/hooks/auth/useAuth'

interface NavbarProps {
  initialUser?: { _id?: string; name: string; role: string; avatarUrl?: string } | null
}

export default function Navbar({ initialUser }: NavbarProps) {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isAiRoute = pathname === '/ai' || pathname === '/roadmap' || pathname === '/flashcards' || pathname === '/analytics' || pathname?.startsWith('/ai/history')
  const isQuizRoute = pathname === '/explore' || pathname === '/my-quizzes' || pathname === '/history' || pathname === '/dashboard' || pathname?.startsWith('/courses/') || pathname?.startsWith('/quiz/')

  const [activePanel, setActivePanel] = useState<'ai' | 'quiz' | null>(null)

  const { data: authData } = useAuth(initialUser ? { user: initialUser } : undefined)
  const user = authData?.user ?? initialUser

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isDev = user?.role === 'dev'

  if (!mounted) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 w-full pt-3 px-4 sm:px-6 md:px-8 pointer-events-none">
        <div className="h-[64px] w-full rounded-[24px] bg-white/50 border border-white/20 shadow-sm pointer-events-auto" />
      </nav>
    )
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-8 pt-4 transition-all duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Main Navbar Card */}
        <div
          className={cn(
            "relative flex items-center justify-between px-5 md:px-7 py-3 rounded-full transition-all duration-300 border",
            isScrolled
              ? "bg-white/80 backdrop-blur-xl border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
              : "bg-white/60 backdrop-blur-md border-white/40 shadow-sm"
          )}
        >
          {/* Left: Brand Logo */}
          <div className="flex-none flex items-center gap-3 z-10">
            <Link href="/" prefetch={false} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#5D7B6F] via-[#6B8D7F] to-[#A4C3B2] p-0.5 shadow-md shadow-[#5D7B6F]/20 group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-[#5D7B6F] rounded-[14px] flex items-center justify-center border border-white/20">
                  <span className="text-white font-black text-xl tracking-tighter">F</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-slate-900 leading-none group-hover:text-[#5D7B6F] transition-colors">
                  FQuiz
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#5D7B6F] mt-0.5">
                  AI Language & Exam
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Service Selection Buttons */}
          <div className="hidden lg:flex items-center gap-2 absolute left-1/2 -translate-x-1/2 z-10">
            <Link
              href={user ? "/dashboard" : "/"}
              prefetch={false}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border",
                pathname === '/' || pathname === '/dashboard'
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white/60 text-slate-700 border-slate-200/80 hover:bg-white hover:text-slate-900 hover:border-slate-300"
              )}
            >
              Bảng điều khiển
            </Link>

            {/* Service 1 Button: Học Ngôn Ngữ AI */}
            {isDev ? (
              <button
                type="button"
                onClick={() => setActivePanel((prev) => (prev === 'ai' ? null : 'ai'))}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border",
                  activePanel === 'ai'
                    ? "bg-[#5D7B6F] text-white border-[#5D7B6F] shadow-md shadow-[#5D7B6F]/25 scale-[1.02]"
                    : isAiRoute
                    ? "bg-[#5D7B6F]/10 text-[#5D7B6F] border-[#5D7B6F]/30"
                    : "bg-white/60 text-slate-700 border-slate-200/80 hover:bg-white hover:text-slate-900 hover:border-[#5D7B6F]/40"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Học Ngôn Ngữ AI
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 border border-emerald-500/40">
                  DEV
                </span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-300", activePanel === 'ai' && "rotate-180")} />
              </button>
            ) : (
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border border-slate-200/80 bg-white/60 text-slate-600 cursor-default select-none"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Học Ngôn Ngữ AI
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-700 border border-amber-400/40">
                  Soon
                </span>
              </div>
            )}

            {/* Service 2 Button: Ôn Thi Trắc Nghiệm */}
            <button
              type="button"
              onClick={() => setActivePanel((prev) => (prev === 'quiz' ? null : 'quiz'))}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border",
                activePanel === 'quiz'
                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/25 scale-[1.02]"
                  : isQuizRoute
                  ? "bg-blue-50 text-blue-600 border-blue-200"
                  : "bg-white/60 text-slate-700 border-slate-200/80 hover:bg-white hover:text-slate-900 hover:border-blue-500/40"
              )}
            >
              <Compass className="w-3.5 h-3.5 text-blue-200" />
              Ôn Thi Trắc Nghiệm
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-300", activePanel === 'quiz' && "rotate-180")} />
            </button>
          </div>

          {/* Right: User Area + Mobile Menu Toggle */}
          <div className="flex-none flex justify-end items-center gap-3 z-10">
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              title="Mở menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {user ? (
              <UserDropdown user={user} />
            ) : (
              <>
                <Link href="/login" prefetch={false} className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors px-2 py-2">
                  Đăng nhập
                </Link>
                <Link href="/register" prefetch={false} className="relative group/btn">
                  <div className="absolute inset-0 bg-[#5D7B6F]/20 rounded-full blur-md group-hover/btn:blur-lg transition-all duration-300 opacity-0 group-hover/btn:opacity-100" />
                  <div className="relative text-xs font-black bg-gradient-to-b from-[#6B8D7F] to-[#5D7B6F] text-white px-5 py-2.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_4px_14px_rgba(93,123,111,0.39)] border border-[#7BA090]/50 tracking-wide">
                    Bắt đầu ngay
                  </div>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Service Function Panel Tab Bar */}
        {activePanel && (
          <div className="hidden lg:block mt-2 relative w-full animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="bg-white/80 backdrop-blur-2xl border border-white/90 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.05)] p-2 flex items-center justify-center gap-2.5">
              {activePanel === 'ai' && isDev ? (
                <>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#5D7B6F] px-3 border-r border-slate-200/80">
                    Học Ngôn Ngữ AI (DEV):
                  </span>
                  <Link
                    href="/ai"
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                      pathname === '/ai'
                        ? "bg-[#5D7B6F] text-white shadow-sm shadow-[#5D7B6F]/20"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                    )}
                  >
                    <Bot className="w-3.5 h-3.5 text-teal-400" />
                    Trợ lý AI Ngôn ngữ
                  </Link>
                  <Link
                    href="/roadmap"
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                      pathname === '/roadmap'
                        ? "bg-[#5D7B6F] text-white shadow-sm shadow-[#5D7B6F]/20"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                    )}
                  >
                    <Map className="w-3.5 h-3.5 text-emerald-400" />
                    Lộ trình bài học
                  </Link>
                  <Link
                    href="/flashcards"
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                      pathname === '/flashcards'
                        ? "bg-[#5D7B6F] text-white shadow-sm shadow-[#5D7B6F]/20"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                    )}
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    Ôn tập Flashcards
                  </Link>
                  <Link
                    href="/analytics"
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                      pathname === '/analytics'
                        ? "bg-[#5D7B6F] text-white shadow-sm shadow-[#5D7B6F]/20"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                    )}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                    Thống kê tiến độ
                  </Link>
                  <Link
                    href="/ai/history"
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                      pathname === '/ai/history'
                        ? "bg-[#5D7B6F] text-white shadow-sm shadow-[#5D7B6F]/20"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                    )}
                  >
                    <History className="w-3.5 h-3.5 text-purple-400" />
                    Lịch sử học AI
                  </Link>
                </>
              ) : activePanel === 'quiz' ? (
                <>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 px-3 border-r border-slate-200/80">
                    Ôn Thi Trắc Nghiệm:
                  </span>
                  <Link
                    href="/explore"
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                      pathname === '/explore' || pathname?.startsWith('/courses/')
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                    )}
                  >
                    <Compass className="w-3.5 h-3.5 text-blue-300" />
                    Khám phá đề thi
                  </Link>
                  <Link
                    href="/my-quizzes"
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                      pathname === '/my-quizzes'
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                    )}
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    Bộ đề của tôi
                  </Link>
                  <Link
                    href="/history"
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                      pathname === '/history'
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                    )}
                  >
                    <History className="w-3.5 h-3.5 text-purple-400" />
                    Lịch sử làm bài
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Mobile Menu Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 bg-white/95 backdrop-blur-2xl border border-white/90 rounded-3xl p-4 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {isDev ? (
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#5D7B6F] px-2 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Học Ngôn Ngữ AI (DEV)
                </p>
                <Link
                  href="/ai"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                    pathname === '/ai' ? "bg-[#5D7B6F]/10 text-[#5D7B6F]" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Bot className="w-4 h-4 text-[#5D7B6F]" /> Trợ lý AI Ngôn ngữ
                </Link>
                <Link
                  href="/roadmap"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                    pathname === '/roadmap' ? "bg-[#5D7B6F]/10 text-[#5D7B6F]" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Map className="w-4 h-4 text-[#5D7B6F]" /> Lộ trình bài học
                </Link>
                <Link
                  href="/flashcards"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                    pathname === '/flashcards' ? "bg-[#5D7B6F]/10 text-[#5D7B6F]" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Layers className="w-4 h-4 text-amber-500" /> Ôn tập Flashcards
                </Link>
                <Link
                  href="/analytics"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                    pathname === '/analytics' ? "bg-[#5D7B6F]/10 text-[#5D7B6F]" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Thống kê tiến độ
                </Link>
              </div>
            ) : (
              <div className="px-3 py-2 flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Học Ngôn Ngữ AI
                </span>
                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-700 border border-amber-400/40">
                  Soon
                </span>
              </div>
            )}

            <div className="h-px bg-slate-100" />

            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 px-2 mb-1 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-500" /> Ôn Thi Trắc Nghiệm
              </p>
              <Link
                href="/explore"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                  pathname === '/explore' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <Compass className="w-4 h-4 text-blue-600" /> Khám phá đề thi
              </Link>
              <Link
                href="/my-quizzes"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                  pathname === '/my-quizzes' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <FileText className="w-4 h-4 text-amber-500" /> Bộ đề của tôi
              </Link>
              <Link
                href="/history"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                  pathname === '/history' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <History className="w-4 h-4 text-purple-500" /> Lịch sử làm bài
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
