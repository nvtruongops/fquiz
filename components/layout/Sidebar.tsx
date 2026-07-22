'use client'

import React, { useState, useEffect, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/core/utils/cn'
import {
  Map, Layers, Bot, FileText, History, Compass, MessageSquare,
  LayoutDashboard, TrendingUp, ChevronLeft, ChevronRight, ChevronDown, Menu, X, LogIn
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserDropdown } from '@/components/layout/UserDropdown'

// ─── Context ─────────────────────────────────────────────────────
interface SidebarContextType {
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
}

const SidebarContext = createContext<SidebarContextType>({
  mobileOpen: false,
  setMobileOpen: () => {},
  collapsed: false,
  setCollapsed: () => {},
  toggleCollapsed: () => {},
})

export const useSidebar = () => useContext(SidebarContext)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('fquiz_sidebar_collapsed')
    if (saved !== null) {
      setCollapsed(saved === 'true')
    }
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('fquiz_sidebar_collapsed', String(next))
      return next
    })
  }

  return (
    <SidebarContext.Provider
      value={{
        mobileOpen,
        setMobileOpen,
        collapsed,
        setCollapsed,
        toggleCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

// ─── Navigation Data ─────────────────────────────────────────────
export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  soon?: boolean
}

export interface Section {
  id: string
  title: string
  color: string
  activeBg: string
  activeText: string
  activeBorder: string
  items: NavItem[]
}

export const navSections: Section[] = [
  {
    id: 'overview',
    title: 'TỔNG QUAN HỆ THỐNG',
    color: 'text-slate-800',
    activeBg: 'bg-slate-900',
    activeText: 'text-white',
    activeBorder: 'border-slate-900',
    items: [
      { label: 'Bảng điều khiển', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'ai-learning',
    title: 'HỌC NGÔN NGỮ (AI)',
    color: 'text-[#5D7B6F]',
    activeBg: 'bg-[#5D7B6F]/10',
    activeText: 'text-[#5D7B6F]',
    activeBorder: 'border-[#5D7B6F]/20',
    items: [
      { label: 'Trợ lý AI', href: '/ai', icon: Bot },
      { label: 'Lộ trình bài học', href: '/roadmap', icon: Map },
      { label: 'Ôn tập Flashcards', href: '/flashcards', icon: Layers },
      { label: 'Phân tích tiến độ', href: '/analytics', icon: TrendingUp },
      { label: 'Lịch sử học AI', href: '/ai/history', icon: History },
    ],
  },
  {
    id: 'quiz-exam',
    title: 'ÔN THI TRẮC NGHIỆM',
    color: 'text-blue-600',
    activeBg: 'bg-blue-50',
    activeText: 'text-blue-600',
    activeBorder: 'border-blue-200',
    items: [
      { label: 'Khám phá khóa học', href: '/explore', icon: Compass },
      { label: 'Bộ đề của tôi', href: '/my-quizzes', icon: FileText },
      { label: 'Lịch sử làm bài', href: '/history', icon: History },
    ],
  },
  {
    id: 'community',
    title: 'CỘNG ĐỒNG HỌC TẬP',
    color: 'text-purple-600',
    activeBg: 'bg-purple-50',
    activeText: 'text-purple-600',
    activeBorder: 'border-purple-200',
    items: [
      { label: 'Diễn đàn học tập', href: '/community', icon: MessageSquare },
    ],
  },
]

interface SidebarProps {
  user?: { _id?: string; name: string; role: string; avatarUrl?: string } | null
}

// ─── Component ───────────────────────────────────────────────────
export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const { mobileOpen, setMobileOpen, collapsed, toggleCollapsed } = useSidebar()

  const isDevOrAdmin = user?.role === 'admin' || user?.role === 'dev'

  // Filter sections: Hide 'ai-learning' section completely for non-dev/non-admin users
  const visibleNavSections = navSections.filter((sec) => {
    if (sec.id === 'ai-learning' && !isDevOrAdmin) {
      return false
    }
    return true
  })

  // Track collapsed state for individual menu sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  const toggleSectionCollapse = (secId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [secId]: !prev[secId]
    }))
  }

  const isActive = (item: NavItem) => {
    if (item.href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    if (item.href === '/my-quizzes') return pathname === '/my-quizzes' || pathname?.startsWith('/create')
    if (item.href === '/explore') return pathname === '/explore' || pathname?.startsWith('/courses')
    return pathname === item.href || pathname?.startsWith(item.href + '/')
  }

  return (
    <>
      {/* ─── MOBILE TOP BAR (lg:hidden) ─────────────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-4 shadow-xs">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#5D7B6F] flex items-center justify-center text-white font-black text-base shadow-xs">
            F
          </div>
          <span className="font-black text-slate-900 text-sm tracking-tight">FQuiz</span>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <UserDropdown user={user} />
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="text-xs font-bold bg-[#5D7B6F] text-white px-3 py-1.5 rounded-full shadow-xs"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full shadow-xs transition-colors"
              >
                Đăng ký
              </Link>
            </div>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer ml-1"
            title="Mở Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ─── DESKTOP PERMANENT SIDEBAR (lg:flex) ──────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? 80 : 256 }}
        transition={{ type: 'spring', stiffness: 350, damping: 32 }}
        className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-white/90 backdrop-blur-xl border-r border-slate-200/80 shadow-[2px_0_20px_rgba(0,0,0,0.02)] overflow-hidden"
      >
        {/* Brand Header */}
        <div className={cn("h-16 flex items-center border-b border-slate-100 flex-shrink-0 transition-all", collapsed ? "justify-center px-2" : "justify-between px-4")}>
          <Link href="/" className="flex items-center gap-3 group overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#5D7B6F] via-[#6B8D7F] to-[#A4C3B2] p-0.5 shadow-md shadow-[#5D7B6F]/20 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-[#5D7B6F] rounded-[10px] flex items-center justify-center border border-white/20">
                <span className="text-white font-black text-lg tracking-tighter">F</span>
              </div>
            </div>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col whitespace-nowrap overflow-hidden"
              >
                <span className="text-base font-black tracking-tight text-slate-900 leading-none group-hover:text-[#5D7B6F] transition-colors">
                  FQuiz
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#5D7B6F] mt-0.5">
                  Multi-Service
                </span>
              </motion.div>
            )}
          </Link>

          {!collapsed && (
            <button
              onClick={toggleCollapsed}
              className="w-7 h-7 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              title="Thu gọn Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scrollable Navigation Items */}
        <nav className={cn("flex-1 overflow-y-auto py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-200", collapsed ? "px-2" : "px-3")}>
          {visibleNavSections.map((sec) => {
            const isSecCollapsed = collapsedSections[sec.id] ?? false
            const hasActiveChild = sec.items.some((item) => isActive(item))

            return (
              <div key={sec.id} className="space-y-1">
                {!collapsed ? (
                  <div
                    onClick={() => toggleSectionCollapse(sec.id)}
                    className="flex items-center justify-between mb-1 px-3 cursor-pointer group select-none py-1 hover:bg-slate-100/60 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className={cn('text-[10px] font-black uppercase tracking-[0.15em]', sec.color)}>
                        {sec.title}
                      </p>
                    </div>
                    {sec.items.length > 1 && (
                      <ChevronDown
                        className={cn(
                          'w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ml-1',
                          isSecCollapsed && !hasActiveChild && '-rotate-90'
                        )}
                      />
                    )}
                  </div>
                ) : (
                  <div className="h-px bg-slate-100 my-2 mx-2" />
                )}

                {/* Show items if section is expanded or if an item in section is currently active */}
                {(!isSecCollapsed || hasActiveChild || collapsed) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1"
                  >
                    {sec.items.map((item) => {
                      const active = isActive(item)
                      const Icon = item.icon

                      return (
                        <Link
                          key={item.href + item.label}
                          href={item.href}
                          title={collapsed ? item.label : undefined}
                          className={cn(
                            'relative flex items-center gap-3 py-2 rounded-2xl transition-all duration-200 group font-semibold text-sm cursor-pointer',
                            collapsed ? 'justify-center px-0' : 'px-3',
                            active
                              ? cn(sec.activeBg, sec.activeText)
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                          )}
                        >
                          {active && (
                            <motion.div
                              layoutId="desktop-sidebar-active"
                              className={cn('absolute inset-0 rounded-2xl border', sec.activeBg, sec.activeBorder)}
                              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                            />
                          )}
                          <Icon
                            className={cn(
                              'w-4.5 h-4.5 flex-shrink-0 relative z-10 transition-colors',
                              active ? sec.activeText : 'text-slate-400 group-hover:text-slate-700'
                            )}
                          />

                          {!collapsed && (
                            <span className="whitespace-nowrap overflow-hidden relative z-10 text-xs font-bold tracking-tight">
                              {item.label}
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </motion.div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Desktop Footer — User Profile Dropdown & Toggle */}
        <div className="p-3 border-t border-slate-100 flex-shrink-0 bg-slate-50/60 overflow-hidden">
          {collapsed ? (
            <div className="w-full flex flex-col items-center gap-2">
              {user ? (
                <UserDropdown user={user} compact={true} />
              ) : (
                <Link
                  href="/login"
                  className="w-8 h-8 rounded-full bg-[#5D7B6F] text-white flex items-center justify-center shadow-xs hover:bg-[#4A6359] transition-all"
                  title="Đăng nhập / Đăng ký"
                >
                  <LogIn className="w-4 h-4" />
                </Link>
              )}
              <button
                onClick={toggleCollapsed}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-600 hover:text-[#5D7B6F] hover:bg-slate-50 transition-all cursor-pointer"
                title="Mở rộng Sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between gap-1 overflow-hidden">
              {user ? (
                <UserDropdown user={user} compact={false} />
              ) : (
                <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold px-2 py-1">
                  <span>FQuiz Guest</span>
                </div>
              )}

              <button
                onClick={toggleCollapsed}
                className="w-7 h-7 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer flex-shrink-0 ml-auto"
                title="Thu gọn Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </motion.aside>

      {/* ─── MOBILE DRAWER (lg:hidden) ────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs lg:hidden"
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 32 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-[280px] bg-white border-r border-slate-200 flex flex-col overflow-hidden lg:hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#5D7B6F] flex items-center justify-center text-white font-black text-lg">
                    F
                  </div>
                  <span className="font-black text-slate-900 text-base">Menu FQuiz</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-4 space-y-6">
                {visibleNavSections.map((sec) => (
                  <div key={sec.id} className="space-y-1">
                    <div className="flex items-center gap-2 mb-2 px-2">
                      <p className={cn('text-[11px] font-black uppercase tracking-wider', sec.color)}>
                        {sec.title}
                      </p>
                    </div>
                    {sec.items.map((item) => {
                      const active = isActive(item)
                      const Icon = item.icon

                      return (
                        <Link
                          key={item.href + item.label}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            'flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all',
                            active ? cn(sec.activeBg, sec.activeText) : 'text-slate-600 hover:bg-slate-100'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={cn('w-5 h-5', active ? sec.activeText : 'text-slate-400')} />
                            <span>{item.label}</span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ))}
              </nav>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                {user ? (
                  <UserDropdown user={user} />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center text-xs font-bold bg-[#5D7B6F] text-white px-3 py-2.5 rounded-xl shadow-xs text-center"
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center text-xs font-bold bg-white text-slate-700 border border-slate-200 px-3 py-2.5 rounded-xl shadow-xs text-center"
                    >
                      Đăng ký
                    </Link>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}