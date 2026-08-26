'use client'

import React, { useState, useEffect, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/core/utils/cn'
import {
  ChevronLeft, ChevronRight, Home, LogIn,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserDropdown } from '@/components/layout/UserDropdown'
import FQuizLogo from '@/components/shared/ui/FQuizLogo'
import { NAV_SECTIONS, Section, NavItem } from '@/lib/core/constants/navigation'

export type { NavItem, Section }
export const navSections = NAV_SECTIONS

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

interface SidebarProps {
  user?: { _id?: string; name: string; role: string; avatarUrl?: string } | null
}

// ─── Component ───────────────────────────────────────────────────
export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const { mobileOpen, setMobileOpen, collapsed, toggleCollapsed } = useSidebar()

  const isTeacher = user?.role === 'teacher'

  const visibleNavSections = navSections.filter(
    (sec) => !(sec.id === 'classroom-section' && isTeacher)
  )

  const isActive = (item: NavItem) => {
    if (item.href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    if (item.href === '/my-quizzes') return pathname === '/my-quizzes'
    if (item.href === '/explore') return pathname === '/explore' || pathname?.startsWith('/courses')
    return pathname === item.href || pathname?.startsWith(item.href + '/')
  }

  return (
    <>
      {/* ─── DESKTOP PERMANENT SIDEBAR (lg:flex) ──────────────────────── */}
      {user && (
        <motion.aside
          animate={{ width: collapsed ? 76 : 252 }}
          transition={{ type: 'spring', stiffness: 350, damping: 32 }}
          className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-card/95 backdrop-blur-xl border-r border-border shadow-xs overflow-hidden"
        >
          {/* Brand Header */}
          <div className={cn(
            "h-16 flex items-center border-b border-border flex-shrink-0 transition-all",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}>
            <Link href="/" prefetch={false} className="flex items-center gap-3 group overflow-hidden">
              <FQuizLogo size={32} />
              {!collapsed && (
                <div className="flex flex-col whitespace-nowrap overflow-hidden">
                  <span className="text-base font-black tracking-tight text-foreground leading-none group-hover:text-primary transition-colors">
                    FQuiz
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-primary mt-0.5">
                    Platform
                  </span>
                </div>
              )}
            </Link>

            {!collapsed && (
              <button
                onClick={toggleCollapsed}
                className="w-7 h-7 rounded-xl bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                title="Thu gọn Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Scrollable Navigation Items */}
          <nav className={cn("flex-1 overflow-y-auto py-3 space-y-4 custom-scrollbar", collapsed ? "px-2" : "px-3")}>
            {/* Top Standalone Dashboard Link */}
            <div>
              <Link
                href="/dashboard"
                prefetch={false}
                title="Bảng điều khiển"
                className={cn(
                  "flex items-center transition-all duration-150 group text-xs font-bold cursor-pointer rounded-xl h-10",
                  collapsed ? "justify-center p-2" : "px-3 gap-3",
                  (pathname === '/dashboard' || pathname === '/')
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                )}
              >
                <Home className={cn(
                  "w-4.5 h-4.5 flex-shrink-0 transition-colors",
                  (pathname === '/dashboard' || pathname === '/') ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {!collapsed && (
                  <span className="whitespace-nowrap overflow-hidden text-xs font-bold tracking-tight">
                    Bảng điều khiển
                  </span>
                )}
              </Link>
            </div>

            {/* Grouped Navigation Sections */}
            {visibleNavSections.map((sec) => (
              <div key={sec.id} className="space-y-1">
                {!collapsed ? (
                  <>
                    {/* Subtle Category Title */}
                    <div className="px-3 pt-2 pb-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 select-none">
                        {sec.title}
                      </p>
                    </div>

                    {/* Section Items */}
                    <div className="space-y-0.5">
                      {sec.items.map((item) => {
                        const active = isActive(item)
                        const Icon = item.icon

                        return (
                          <Link
                            key={item.href + item.label}
                            href={item.href}
                            prefetch={false}
                            className={cn(
                              'flex items-center gap-3 h-10 px-3 rounded-xl transition-all duration-150 group text-xs font-bold cursor-pointer',
                              active
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                            )}
                          >
                            <Icon
                              className={cn(
                                'w-4.5 h-4.5 flex-shrink-0 transition-colors',
                                active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                              )}
                            />
                            <span className="whitespace-nowrap overflow-hidden text-xs font-bold tracking-tight">
                              {item.label}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  /* Collapsed Icon-Only Mode */
                  <div className="space-y-1">
                    <div className="w-8 h-px bg-border mx-auto my-1.5 opacity-60" />
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
                            'w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all duration-150 group cursor-pointer my-0.5',
                            active
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                          )}
                        >
                          <Icon
                            className={cn(
                              'w-4.5 h-4.5 flex-shrink-0 transition-colors',
                              active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                            )}
                          />
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Desktop Footer — User Profile Card */}
          <div className="p-3 border-t border-border flex-shrink-0 bg-muted/20 overflow-hidden">
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
                  className="w-8 h-8 rounded-xl bg-card border border-border shadow-2xs flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-all cursor-pointer"
                  title="Mở rộng Sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="w-full">
                {user ? (
                  <UserDropdown user={user} fullCard={true} />
                ) : (
                  <div className="flex items-center justify-between gap-2 p-2 bg-card rounded-xl border border-border">
                    <span className="text-xs font-bold text-muted-foreground">FQuiz Guest</span>
                    <Link
                      href="/login"
                      prefetch={false}
                      className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg shadow-xs"
                    >
                      Đăng nhập
                    </Link>
                  </div>
                )}
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
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs lg:hidden"
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
                  <FQuizLogo size={32} />
                  <span className="font-black text-foreground text-base">FQuiz Menu</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {/* Dashboard Link */}
                <Link
                  href="/dashboard"
                  prefetch={false}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3.5 h-11 rounded-xl text-xs font-bold transition-all",
                    (pathname === '/dashboard' || pathname === '/')
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                >
                  <Home className={cn("w-4.5 h-4.5", (pathname === '/dashboard' || pathname === '/') ? "text-primary-foreground" : "text-muted-foreground")} />
                  <span>Bảng điều khiển</span>
                </Link>

                {visibleNavSections.map((sec) => (
                  <div key={sec.id} className="space-y-1">
                    <div className="px-3 pt-2 pb-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 select-none">
                        {sec.title}
                      </p>
                    </div>

                    <div className="space-y-0.5">
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
                              'flex items-center gap-3 px-3.5 h-11 rounded-xl text-xs font-bold transition-all',
                              active
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                            )}
                          >
                            <Icon className={cn('w-4.5 h-4.5', active ? 'text-primary-foreground' : 'text-muted-foreground')} />
                            <span>{item.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              <div className="p-4 border-t border-border bg-muted/40">
                {user ? (
                  <UserDropdown user={user} fullCard={true} />
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