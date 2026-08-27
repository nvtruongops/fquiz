'use client'

import React, { useState, useEffect, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/core/utils/cn'
import {
  ChevronLeft, ChevronRight, Home, LogIn, User, UserPlus, Lock
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserDropdown } from '@/components/layout/UserDropdown'
import { NAV_SECTIONS, Section, NavItem } from '@/lib/core/constants/navigation'
import { useAuthPrompt } from '@/store/shared/auth-prompt-store'

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
  const { openAuthPrompt } = useAuthPrompt()

  const isTeacher = user?.role === 'teacher'

  const visibleNavSections = navSections.filter(
    (sec) => !(sec.id === 'classroom-section' && isTeacher)
  )

  const isActive = (item: NavItem) => {
    if (item.href === '/dashboard') return pathname === '/dashboard'
    if (item.href === '/explore') return pathname === '/explore' || pathname?.startsWith('/courses')
    return pathname === item.href || pathname?.startsWith(item.href + '/')
  }

  const handleProtectedClick = (
    e: React.MouseEvent,
    item: { label: string; href: string; requiresAuth?: boolean; description?: string }
  ) => {
    if (!user && item.requiresAuth) {
      e.preventDefault()
      openAuthPrompt({
        featureName: item.label,
        description: item.description,
        targetUrl: item.href,
      })
      if (mobileOpen) {
        setMobileOpen(false)
      }
    }
  }

  return (
    <>
      {/* ─── DESKTOP PERMANENT SIDEBAR (lg:flex) ──────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 252 }}
        transition={{ type: 'spring', stiffness: 350, damping: 32 }}
        className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-card/95 backdrop-blur-xl border-r border-border shadow-xs overflow-hidden"
      >
        {/* Brand Header */}
        <div className={cn(
          "h-16 flex items-center border-b border-border flex-shrink-0 transition-all",
          collapsed ? "justify-center px-2" : "px-6"
        )}>
          <Link href="/" prefetch={false} className="flex items-center gap-2 group overflow-hidden">
            {collapsed ? (
              <span className="text-xl font-black text-primary">F</span>
            ) : (
              <div className="flex items-baseline gap-2 whitespace-nowrap overflow-hidden">
                <span className="text-xl font-black tracking-tight text-foreground leading-none group-hover:text-primary transition-colors">
                  FQuiz
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-md border border-primary/20 leading-none">
                  Platform
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Scrollable Navigation Items */}
        <nav className={cn("flex-1 overflow-y-auto py-3 space-y-4 custom-scrollbar", collapsed ? "px-2" : "px-3")}>
          {/* Top Standalone Dashboard Link */}
          <div>
            <Link
              href={user ? '/dashboard' : '/'}
              prefetch={false}
              title={user ? 'Bảng điều khiển' : 'Trang chủ'}
              onClick={(e) => {
                if (!user && pathname !== '/') {
                  // If guest clicks dashboard item when on other page, allow navigating home or show auth prompt
                }
              }}
              className={cn(
                "flex items-center transition-all duration-150 group text-xs font-bold cursor-pointer rounded-xl h-10",
                collapsed ? "justify-center p-2" : "px-3 gap-3",
                (pathname === '/dashboard' || (pathname === '/' && !user))
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
            >
              <Home className={cn(
                "w-4.5 h-4.5 flex-shrink-0 transition-colors",
                (pathname === '/dashboard' || (pathname === '/' && !user))
                  ? "text-primary-foreground"
                  : "text-muted-foreground group-hover:text-foreground"
              )} />
              {!collapsed && (
                <span className="whitespace-nowrap overflow-hidden text-xs font-bold tracking-tight">
                  {user ? 'Bảng điều khiển' : 'Trang chủ'}
                </span>
              )}
            </Link>
          </div>

          {/* Grouped Navigation Sections */}
          {visibleNavSections.map((sec) => (
            <div key={sec.id} className="space-y-1">
              {!collapsed ? (
                <>
                  {/* Category Title */}
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
                      const isLockedForGuest = !user && item.requiresAuth

                      return (
                        <Link
                          key={item.href + item.label}
                          href={item.href}
                          prefetch={false}
                          onClick={(e) => handleProtectedClick(e, item)}
                          className={cn(
                            'flex items-center justify-between h-10 px-3 rounded-xl transition-all duration-150 group text-xs font-bold cursor-pointer',
                            active
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon
                              className={cn(
                                'w-4.5 h-4.5 flex-shrink-0 transition-colors',
                                active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                              )}
                            />
                            <span className="whitespace-nowrap overflow-hidden text-xs font-bold tracking-tight truncate">
                              {item.label}
                            </span>
                          </div>

                          {isLockedForGuest && (
                            <Lock className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors shrink-0 ml-1.5" />
                          )}
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
                    const isLockedForGuest = !user && item.requiresAuth

                    return (
                      <Link
                        key={item.href + item.label}
                        href={item.href}
                        prefetch={false}
                        title={item.label + (isLockedForGuest ? ' (Cần đăng nhập)' : '')}
                        onClick={(e) => handleProtectedClick(e, item)}
                        className={cn(
                          'w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all duration-150 group cursor-pointer my-0.5 relative',
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
                        {isLockedForGuest && (
                          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary/80" />
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Desktop Footer — User Profile or Guest Actions */}
        <div className="p-3 border-t border-border flex-shrink-0 bg-muted/20 overflow-hidden">
          {collapsed ? (
            <div className="w-full flex flex-col items-center gap-2">
              {user ? (
                <UserDropdown user={user} compact={true} />
              ) : (
                <Link
                  href="/login"
                  prefetch={false}
                  className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
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
            <div className="w-full space-y-2">
              {user ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <UserDropdown user={user} fullCard={true} />
                  </div>
                  <button
                    onClick={toggleCollapsed}
                    className="w-7 h-7 rounded-lg bg-card border border-border/80 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-all cursor-pointer shrink-0"
                    title="Thu gọn Sidebar"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                /* Guest Card for Non-Logged-In Users */
                <div className="p-3 rounded-2xl bg-card border border-border shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-foreground truncate">Khách FQuiz</p>
                        <p className="text-[10px] font-semibold text-muted-foreground truncate">Chưa đăng nhập</p>
                      </div>
                    </div>
                    <button
                      onClick={toggleCollapsed}
                      className="w-6 h-6 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-all cursor-pointer shrink-0"
                      title="Thu gọn Sidebar"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <Link
                      href="/login"
                      prefetch={false}
                      className="flex items-center justify-center gap-1 h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-black shadow-xs transition-all cursor-pointer"
                    >
                      <LogIn className="w-3 h-3" />
                      <span>Đăng nhập</span>
                    </Link>
                    <Link
                      href="/register"
                      prefetch={false}
                      className="flex items-center justify-center gap-1 h-8 rounded-xl border border-border bg-muted/50 hover:bg-muted text-foreground text-[11px] font-bold transition-all cursor-pointer"
                    >
                      <UserPlus className="w-3 h-3 text-primary" />
                      <span>Đăng ký</span>
                    </Link>
                  </div>
                </div>
              )}
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
                <div className="flex items-center gap-2">
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
                  href={user ? '/dashboard' : '/'}
                  prefetch={false}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3.5 h-11 rounded-xl text-xs font-bold transition-all",
                    (pathname === '/dashboard' || (pathname === '/' && !user))
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                >
                  <Home className={cn("w-4.5 h-4.5", (pathname === '/dashboard' || (pathname === '/' && !user)) ? "text-primary-foreground" : "text-muted-foreground")} />
                  <span>{user ? 'Bảng điều khiển' : 'Trang chủ'}</span>
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
                        const isLockedForGuest = !user && item.requiresAuth

                        return (
                          <Link
                            key={item.href + item.label}
                            href={item.href}
                            prefetch={false}
                            onClick={(e) => handleProtectedClick(e, item)}
                            className={cn(
                              'flex items-center justify-between px-3.5 h-11 rounded-xl text-xs font-bold transition-all',
                              active
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon className={cn('w-4.5 h-4.5', active ? 'text-primary-foreground' : 'text-muted-foreground')} />
                              <span className="truncate">{item.label}</span>
                            </div>
                            {isLockedForGuest && (
                              <Lock className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                            )}
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
                  <div className="space-y-2">
                    <div className="text-center pb-1">
                      <p className="text-xs font-black text-foreground">Bạn chưa đăng nhập</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Đăng nhập để lưu tiến độ ôn thi</p>
                    </div>
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