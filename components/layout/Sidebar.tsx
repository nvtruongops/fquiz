'use client'

import React, { useState, useEffect, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/core/utils/cn'
import {
  Map, Layers, Bot, FileText, History, Compass, MessageSquare,
  LayoutDashboard, TrendingUp, ChevronLeft, ChevronRight, ChevronDown, Menu, X, LogIn,
  School, GraduationCap, Sparkles, BookCheck, Home, Users, UserCheck, Clock, BrainCircuit
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserDropdown } from '@/components/layout/UserDropdown'
import FQuizLogo from '@/components/shared/ui/FQuizLogo'

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
import { NAV_SECTIONS, Section, NavItem } from '@/lib/core/constants/navigation'

export type { NavItem, Section }
export const navSections = NAV_SECTIONS

interface SidebarProps {
  user?: { _id?: string; name: string; role: string; avatarUrl?: string } | null
}

// ─── Component ───────────────────────────────────────────────────
export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const { mobileOpen, setMobileOpen, collapsed, toggleCollapsed } = useSidebar()

  const isDevOrAdmin = user?.role === 'admin' || user?.role === 'dev'
  const isTeacher = user?.role === 'teacher'

  // Filter sections and items based on role
  const visibleNavSections = navSections.filter((sec) => {
    if (sec.id === 'ai-learning' && !isDevOrAdmin) {
      return false
    }
    if (sec.id === 'classroom-section' && isTeacher) {
      return false
    }
    return true
  })

  // Single active section state: opening a section closes all other sections
  const [openSectionId, setOpenSectionId] = useState<string | null>(null)

  const toggleSectionExpand = (secId: string, hasActiveChild: boolean) => {
    setOpenSectionId((prev) => {
      const currentlyOpenId = prev !== null ? prev : (hasActiveChild ? secId : null)
      return currentlyOpenId === secId ? 'none' : secId
    })
  }

  const isActive = (item: NavItem) => {
    if (item.href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    if (item.href === '/my-quizzes') return pathname === '/my-quizzes' || pathname?.startsWith('/create')
    if (item.href === '/explore') return pathname === '/explore' || pathname?.startsWith('/courses')
    return pathname === item.href || pathname?.startsWith(item.href + '/')
  }

  return (
    <>
      {/* ─── DESKTOP PERMANENT SIDEBAR (lg:flex) ──────────────────────── */}
      {user && (
        <motion.aside
          animate={{ width: collapsed ? 80 : 256 }}
          transition={{ type: 'spring', stiffness: 350, damping: 32 }}
          className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-card/90 backdrop-blur-xl border-r border-border shadow-sm overflow-hidden"
        >
          {/* Brand Header */}
          <div className={cn("h-16 flex items-center border-b border-border flex-shrink-0 transition-all", collapsed ? "justify-center px-2" : "justify-between px-4")}>
            <Link href="/" prefetch={false} className="flex items-center gap-3 group overflow-hidden">
              <FQuizLogo size={34} />
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col whitespace-nowrap overflow-hidden"
                >
                  <span className="text-base font-black tracking-tight text-foreground leading-none group-hover:text-primary transition-colors">
                    FQuiz
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-primary mt-0.5">
                    Multi-Service
                  </span>
                </motion.div>
              )}
            </Link>

            {!collapsed && (
              <button
                onClick={toggleCollapsed}
                className="w-7 h-7 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground flex items-center justify-center transition-colors cursor-pointer"
                title="Thu gọn Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Scrollable Navigation Items */}
          <nav className={cn("flex-1 overflow-y-auto py-4 space-y-3 custom-scrollbar", collapsed ? "px-2" : "px-3")}>
            {/* Top Standalone Dashboard Link */}
            <Link
              href="/dashboard"
              prefetch={false}
              title="Bảng điều khiển"
              className={cn(
                "relative flex items-center transition-all duration-200 group font-bold text-sm cursor-pointer border mb-3",
                collapsed ? "justify-center p-2.5 rounded-2xl" : "py-2.5 px-3 rounded-2xl gap-3",
                (pathname === '/dashboard' || pathname === '/')
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-muted/40 border-border text-foreground hover:bg-muted"
              )}
            >
              <Home className={cn("w-4.5 h-4.5 flex-shrink-0 transition-colors", (pathname === '/dashboard' || pathname === '/') ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
              {!collapsed && (
                <span className="whitespace-nowrap overflow-hidden text-xs font-bold tracking-tight">
                  Bảng điều khiển
                </span>
              )}
            </Link>

            {visibleNavSections.map((sec, secIdx) => {
              const hasActiveChild = sec.items.some((item) => isActive(item))
              const isExpanded = openSectionId !== null ? openSectionId === sec.id : hasActiveChild

              return (
                <div key={sec.id} className="space-y-1">
                  {!collapsed ? (
                    <>
                      <div
                        onClick={() => toggleSectionExpand(sec.id, hasActiveChild)}
                        className={cn(
                          "flex items-center justify-between mb-1 px-3 cursor-pointer group select-none py-1.5 rounded-xl transition-all border",
                          isExpanded
                            ? "bg-muted/80 border-border font-bold"
                            : "bg-muted/30 border-border/50 hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className={cn('text-[11px] font-black uppercase tracking-[0.12em]', sec.color)}>
                            {sec.title}
                          </p>
                        </div>
                        <ChevronDown
                          className={cn(
                            'w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform duration-200 shrink-0 ml-1',
                            !isExpanded && '-rotate-90'
                          )}
                        />
                      </div>

                      {/* Show items ONLY if section is expanded */}
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-1 pl-1"
                        >
                          {sec.items.map((item) => {
                            const active = isActive(item)
                            const Icon = item.icon

                            return (
                              <Link
                                key={item.href + item.label}
                                href={item.href}
                                prefetch={false}
                                className={cn(
                                  'relative flex items-center gap-3 py-2 px-3 rounded-2xl transition-all duration-200 group font-semibold text-sm cursor-pointer',
                                  active
                                    ? cn(sec.activeBg, sec.activeText)
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
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
                                    active ? sec.activeText : 'text-muted-foreground group-hover:text-foreground'
                                  )}
                                />
                                <span className="whitespace-nowrap overflow-hidden relative z-10 text-xs font-bold tracking-tight">
                                  {item.label}
                                </span>
                              </Link>
                            )
                          })}
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-1">
                      <button
                        onClick={() => toggleSectionExpand(sec.id, false)}
                        className={cn(
                          "w-10 h-10 mx-auto flex items-center justify-center rounded-2xl transition-all cursor-pointer border my-1 shadow-xs group relative",
                          isExpanded
                            ? cn(sec.activeBg, sec.activeBorder, sec.activeText)
                            : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                        title={sec.title}
                      >
                        <sec.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                      </button>

                      {/* Sub-tabs fold/unfold in collapsed mode */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-1.5 py-1 px-1 bg-muted/60 rounded-2xl border border-border my-1"
                          >
                            {sec.items.map((item) => {
                              const active = isActive(item)
                              const Icon = item.icon

                              return (
                                <Link
                                  key={item.href + item.label}
                                  href={item.href}
                                  prefetch={false}
                                  title={item.label}
                                  className={cn(
                                    'relative flex items-center justify-center py-2 rounded-xl transition-all duration-200 group cursor-pointer',
                                    active
                                      ? cn(sec.activeBg, sec.activeText, 'shadow-xs font-bold')
                                      : 'text-muted-foreground hover:text-foreground hover:bg-card'
                                  )}
                                >
                                  <Icon
                                    className={cn(
                                      'w-4 h-4 flex-shrink-0 relative z-10 transition-colors',
                                      active ? sec.activeText : 'text-muted-foreground group-hover:text-foreground'
                                    )}
                                  />
                                </Link>
                              )
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Desktop Footer — User Profile Dropdown & Toggle */}
          <div className="p-3 border-t border-border flex-shrink-0 bg-muted/30 overflow-hidden">
            {collapsed ? (
              <div className="w-full flex flex-col items-center gap-2">
                {user ? (
                  <UserDropdown user={user} compact={true} />
                ) : (
                  <Link
                    href="/login"
                    prefetch={false}
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs hover:bg-primary/90 transition-all"
                    title="Đăng nhập / Đăng ký"
                  >
                    <LogIn className="w-4 h-4" />
                  </Link>
                )}
                <button
                  onClick={toggleCollapsed}
                  className="w-8 h-8 rounded-xl bg-card border border-border shadow-xs flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-all cursor-pointer"
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
                  <div className="flex items-center gap-1 text-muted-foreground text-xs font-semibold px-2 py-1">
                    <span>FQuiz Guest</span>
                  </div>
                )}

                <button
                  onClick={toggleCollapsed}
                  className="w-7 h-7 rounded-xl bg-card border border-border shadow-xs flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex-shrink-0 ml-auto"
                  title="Thu gọn Sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </motion.aside>
      )}

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
              className="fixed left-0 top-0 bottom-0 z-50 w-[280px] bg-card border-r border-border flex flex-col overflow-hidden lg:hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg">
                    F
                  </div>
                  <span className="font-black text-foreground text-base">Menu FQuiz</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {/* Top Standalone Dashboard Link */}
                <Link
                  href="/dashboard"
                  prefetch={false}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border",
                    (pathname === '/dashboard' || pathname === '/')
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/40 border-border text-foreground hover:bg-muted"
                  )}
                >
                  <Home className={cn("w-4 h-4", (pathname === '/dashboard' || pathname === '/') ? "text-primary-foreground" : "text-muted-foreground")} />
                  <span>Bảng điều khiển</span>
                </Link>

                {visibleNavSections.map((sec) => {
                  const hasActiveChild = sec.items.some((item) => isActive(item))
                  const isExpanded = openSectionId !== null ? openSectionId === sec.id : hasActiveChild

                  return (
                    <div key={sec.id} className="space-y-1 border border-border rounded-xl p-2 bg-muted/30">
                      <div
                        onClick={() => toggleSectionExpand(sec.id, hasActiveChild)}
                        className="flex items-center justify-between p-2 cursor-pointer select-none"
                      >
                        <p className={cn('text-[11px] font-black uppercase tracking-wider', sec.color)}>
                          {sec.title}
                        </p>
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 text-muted-foreground transition-transform duration-200',
                            !isExpanded && '-rotate-90'
                          )}
                        />
                      </div>
                      {isExpanded && (
                        <div className="space-y-1 pt-1">
                          {sec.items.map((item) => {
                            const active = isActive(item)
                            const Icon = item.icon

                            return (
                              <Link
                                key={item.href + item.label}
                                href={item.href}
                                prefetch={false}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                  'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all',
                                  active ? cn(sec.activeBg, sec.activeText) : 'text-muted-foreground hover:bg-muted'
                                )}
                              >
                                <div className="flex items-center gap-2.5">
                                  <Icon className={cn('w-4 h-4', active ? sec.activeText : 'text-muted-foreground')} />
                                  <span>{item.label}</span>
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </nav>

              <div className="p-4 border-t border-border bg-muted/40">
                {user ? (
                  <UserDropdown user={user} />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/login"
                      prefetch={false}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground px-3 py-2.5 rounded-xl shadow-xs text-center"
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      href="/register"
                      prefetch={false}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center text-xs font-bold bg-card text-foreground border border-border px-3 py-2.5 rounded-xl shadow-xs text-center"
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