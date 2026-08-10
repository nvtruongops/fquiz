'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useQueryClient } from '@tanstack/react-query'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { cn } from '@/lib/core/utils/cn'
import {
  Home,
  BookCheck,
  User,
  GraduationCap,
  Users,
  Compass,
  FileText,
  Clock,
  Settings,
  LogOut,
  ChevronRight,
  School,
  X,
  LogIn,
  UserPlus,
  Sun,
  Moon,
  Sparkles,
  Heart,
  Leaf
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLogout } from '@/hooks/useLogout'

interface MobileNavProps {
  user?: { name: string; role: string; avatarUrl?: string } | null
}

export function MobileNav({ user }: MobileNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [examMenuOpen, setExamMenuOpen] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const [mounted, setMounted] = useState(false)

  const [showCustomThemes, setShowCustomThemes] = useState(false)
  const { theme, setTheme } = useTheme()
  const queryClient = useQueryClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    if (user) {
      fetch('/api/v1/user/theme', {
        method: 'PUT',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ theme: newTheme }),
      })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['auth-user'] })
        })
        .catch(() => {})
    }
  }

  const { handleLogout: triggerLogout } = useLogout()

  const closeAllMenus = () => {
    setUserMenuOpen(false)
    setExamMenuOpen(false)
  }

  const handleLogout = () => {
    triggerLogout('/login')
  }

  // Hide bottom nav on full screen exam engine routes
  const isSessionPage = pathname?.includes('/session/') || pathname?.includes('/mode')
  if (isSessionPage) return null

  // Active status checks
  const isHomeActive = pathname === '/' || pathname === '/dashboard'
  const isExamActive = pathname === '/explore' || pathname === '/my-quizzes' || pathname === '/history' || pathname?.startsWith('/courses') || pathname?.startsWith('/create')
  const isUserActive = pathname === '/profile' || pathname === '/settings'
  const isTeacherRole = user?.role === 'teacher' || user?.role === 'admin'
  const classroomHref = isTeacherRole ? '/teacher/classrooms' : '/student/classrooms'
  const isClassroomActive = pathname?.startsWith('/student/classrooms') || pathname?.startsWith('/teacher/classrooms')
  const isCommunityActive = pathname === '/community'

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U'
  const hasAvatar = !!user?.avatarUrl && !avatarError

  const roleLabel = user?.role === 'admin'
    ? 'Admin'
    : user?.role === 'teacher'
    ? 'Giáo viên'
    : 'Học sinh'

  return (
    <>
      {/* OVERLAY POPUP BACKDROP */}
      <AnimatePresence>
        {(userMenuOpen || examMenuOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAllMenus}
            className="fixed inset-0 bg-background/60 backdrop-blur-xs z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-3 inset-x-3 z-50 lg:hidden max-w-lg mx-auto">
        {/* ─── POPUP MENU 1: ÔN THI TRẮC NGHIỆM (ATTACHED BLOCK ABOVE NAVBAR) ── */}
        <AnimatePresence>
          {examMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute bottom-full mb-3 inset-x-0 w-full bg-card/95 backdrop-blur-2xl border border-border rounded-3xl shadow-2xl p-3 space-y-1.5 overflow-hidden z-50"
            >
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-primary">
                  Ôn thi trắc nghiệm
                </span>
                <button
                  type="button"
                  onClick={closeAllMenus}
                  className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <Link
                href="/explore"
                prefetch={false}
                onClick={closeAllMenus}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all active:scale-98",
                  pathname === '/explore' || pathname?.startsWith('/courses')
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <Compass className="w-4.5 h-4.5 text-primary shrink-0" />
                <span>Khám phá đề thi</span>
              </Link>

              <Link
                href="/my-quizzes"
                prefetch={false}
                onClick={closeAllMenus}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all active:scale-98",
                  pathname === '/my-quizzes' || pathname?.startsWith('/create')
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <FileText className="w-4.5 h-4.5 text-primary shrink-0" />
                <span>Bộ đề của tôi</span>
              </Link>

              <Link
                href="/history"
                prefetch={false}
                onClick={closeAllMenus}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all active:scale-98",
                  pathname === '/history'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <Clock className="w-4.5 h-4.5 text-primary shrink-0" />
                <span>Lịch sử làm bài</span>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── POPUP MENU 2: TÀI KHOẢN USER (ATTACHED BLOCK ABOVE NAVBAR) ── */}
        <AnimatePresence>
          {userMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute bottom-full mb-3 inset-x-0 w-full bg-card/95 backdrop-blur-2xl border border-border rounded-3xl shadow-2xl p-3 space-y-1.5 overflow-hidden z-50"
            >
              {user ? (
                <>
                  <div className="px-3.5 py-3 border-b border-border flex items-center justify-between bg-muted/50 rounded-2xl mb-1">
                    <div className="flex items-center gap-3 min-w-0">
                      {hasAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          referrerPolicy="no-referrer"
                          onError={() => setAvatarError(true)}
                          className="w-10 h-10 rounded-xl object-cover ring-2 ring-primary/30 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-base shrink-0 shadow-xs">
                          {initial}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-foreground truncate">{user.name}</span>
                        <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider">
                          {roleLabel}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeAllMenus}
                      className="w-6 h-6 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground shadow-xs shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Link
                    href="/profile"
                    prefetch={false}
                    onClick={closeAllMenus}
                    className="flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold text-foreground hover:bg-muted transition-colors active:scale-98"
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="w-4.5 h-4.5 text-primary" />
                      <span>Trang cá nhân</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>

                  <Link
                    href="/settings"
                    prefetch={false}
                    onClick={closeAllMenus}
                    className="flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold text-foreground hover:bg-muted transition-colors active:scale-98"
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="w-4.5 h-4.5 text-muted-foreground" />
                      <span>Cài đặt tài khoản</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      closeAllMenus()
                      handleLogout()
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer active:scale-98"
                  >
                    <div className="flex items-center gap-2.5">
                      <LogOut className="w-4.5 h-4.5 text-destructive" />
                      <span>Đăng xuất</span>
                    </div>
                  </button>

                  {mounted && (
                    <div className="pt-2 border-t border-border mt-1">
                      <div className="flex items-center justify-between px-2 mb-1.5">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          Giao diện
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-2xl border border-border/60">
                        <button
                          type="button"
                          onClick={() => {
                            handleThemeChange('light')
                            setShowCustomThemes(false)
                          }}
                          className={cn(
                            "flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none",
                            theme === 'light' ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Sun className="w-3.5 h-3.5" />
                          <span>Sáng</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleThemeChange('dark')
                            setShowCustomThemes(false)
                          }}
                          className={cn(
                            "flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none",
                            theme === 'dark' ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Moon className="w-3.5 h-3.5" />
                          <span>Tối</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCustomThemes(prev => !prev)}
                          className={cn(
                            "flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none",
                            theme === 'green' || theme === 'pink' || showCustomThemes ? "bg-card text-primary shadow-xs font-black" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Tùy chỉnh</span>
                        </button>
                      </div>

                      {(showCustomThemes || theme === 'green' || theme === 'pink') && (
                        <div className="grid grid-cols-2 gap-1.5 bg-muted/40 p-1.5 rounded-2xl border border-border/50 mt-1.5">
                          <button
                            type="button"
                            onClick={() => handleThemeChange('green')}
                            className={cn(
                              "flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none",
                              theme === 'green' ? "bg-primary text-primary-foreground shadow-xs" : "bg-card text-foreground hover:bg-muted border border-border/60"
                            )}
                          >
                            <Leaf className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Green</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleThemeChange('pink')}
                            className={cn(
                              "flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none",
                              theme === 'pink' ? "bg-primary text-primary-foreground shadow-xs" : "bg-card text-foreground hover:bg-muted border border-border/60"
                            )}
                          >
                            <Heart className="w-3.5 h-3.5 text-rose-500" />
                            <span>Pink</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="px-3 py-1.5 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Tài khoản FQuiz</span>
                    <button
                      type="button"
                      onClick={closeAllMenus}
                      className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <Link
                      href="/login"
                      prefetch={false}
                      onClick={closeAllMenus}
                      className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold bg-primary text-primary-foreground shadow-xs active:scale-98"
                    >
                      <LogIn className="w-4.5 h-4.5 shrink-0" />
                      <span>Đăng nhập ngay</span>
                    </Link>
                    <Link
                      href="/register"
                      prefetch={false}
                      onClick={closeAllMenus}
                      className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border/60 shadow-xs active:scale-98"
                    >
                      <UserPlus className="w-4.5 h-4.5 shrink-0 text-primary" />
                      <span>Đăng ký tài khoản mới</span>
                    </Link>
                  </div>

                  {mounted && (
                    <div className="pt-2 border-t border-border mt-1">
                      <div className="flex items-center justify-between px-2 mb-1.5">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          Giao diện
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-2xl border border-border/60">
                        <button
                          type="button"
                          onClick={() => {
                            handleThemeChange('light')
                            setShowCustomThemes(false)
                          }}
                          className={cn(
                            "flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none",
                            theme === 'light' ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Sun className="w-3.5 h-3.5" />
                          <span>Sáng</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleThemeChange('dark')
                            setShowCustomThemes(false)
                          }}
                          className={cn(
                            "flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none",
                            theme === 'dark' ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Moon className="w-3.5 h-3.5" />
                          <span>Tối</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCustomThemes(prev => !prev)}
                          className={cn(
                            "flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none",
                            theme === 'green' || theme === 'pink' || showCustomThemes ? "bg-card text-primary shadow-xs font-black" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Tùy chỉnh</span>
                        </button>
                      </div>

                      {(showCustomThemes || theme === 'green' || theme === 'pink') && (
                        <div className="grid grid-cols-2 gap-1.5 bg-muted/40 p-1.5 rounded-2xl border border-border/50 mt-1.5">
                          <button
                            type="button"
                            onClick={() => handleThemeChange('green')}
                            className={cn(
                              "flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none",
                              theme === 'green' ? "bg-primary text-primary-foreground shadow-xs" : "bg-card text-foreground hover:bg-muted border border-border/60"
                            )}
                          >
                            <Leaf className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Green</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleThemeChange('pink')}
                            className={cn(
                              "flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none",
                              theme === 'pink' ? "bg-primary text-primary-foreground shadow-xs" : "bg-card text-foreground hover:bg-muted border border-border/60"
                            )}
                          >
                            <Heart className="w-3.5 h-3.5 text-rose-500" />
                            <span>Pink</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── MAIN FLOATING DOCK BAR (5 ICONS) ────────────────── */}
        <nav className="relative bg-card/90 backdrop-blur-2xl border border-border rounded-[2rem] shadow-[0_16px_40px_rgba(0,0,0,0.18)] p-1.5 flex items-center justify-between gap-1">
          {/* ICON 1: TRANG CHỦ / DASHBOARD */}
          <Link
            href={user ? "/dashboard" : "/"}
            prefetch={false}
            onClick={closeAllMenus}
            className="relative flex-1 flex flex-col items-center justify-center py-1.5 px-1 transition-all duration-300 min-h-[48px] rounded-2xl group outline-none active:scale-95 select-none"
          >
            {isHomeActive && (
              <div className="absolute inset-0 bg-primary/10 rounded-2xl shadow-xs border border-primary/20 -z-10 transition-all duration-200" />
            )}
            <div className={cn(
              "relative flex items-center justify-center transition-all duration-300",
              isHomeActive ? "text-primary scale-110 mb-0.5" : "text-muted-foreground group-hover:text-foreground"
            )}>
              {isHomeActive && <div className="absolute inset-0 bg-primary/25 blur-md rounded-full -z-10" />}
              <Home className={cn("w-[20px] h-[20px]", isHomeActive ? "stroke-[2.5px]" : "stroke-2")} />
            </div>
            <span className={cn(
              "text-[9px] sm:text-[10px] font-black tracking-tight text-center leading-none transition-all duration-300 mt-0.5 whitespace-nowrap",
              isHomeActive ? "text-primary opacity-100" : "text-muted-foreground opacity-80 group-hover:opacity-100"
            )}>
              Trang chủ
            </span>
          </Link>

          {/* ICON 2: ÔN THI (POPUP 3 SUB-TABS) */}
          <button
            type="button"
            onClick={() => {
              setUserMenuOpen(false)
              setExamMenuOpen(!examMenuOpen)
            }}
            className="relative flex-1 flex flex-col items-center justify-center py-1.5 px-1 transition-all duration-300 min-h-[48px] rounded-2xl group outline-none active:scale-95 select-none cursor-pointer"
          >
            {(isExamActive || examMenuOpen) && (
              <div className="absolute inset-0 bg-primary/10 rounded-2xl shadow-xs border border-primary/20 -z-10 transition-all duration-200" />
            )}
            <div className={cn(
              "relative flex items-center justify-center transition-all duration-300",
              (isExamActive || examMenuOpen) ? "text-primary scale-110 mb-0.5" : "text-muted-foreground group-hover:text-foreground"
            )}>
              {(isExamActive || examMenuOpen) && <div className="absolute inset-0 bg-primary/25 blur-md rounded-full -z-10" />}
              <BookCheck className={cn("w-[20px] h-[20px]", (isExamActive || examMenuOpen) ? "stroke-[2.5px]" : "stroke-2")} />
            </div>
            <span className={cn(
              "text-[9px] sm:text-[10px] font-black tracking-tight text-center leading-none transition-all duration-300 mt-0.5 whitespace-nowrap",
              (isExamActive || examMenuOpen) ? "text-primary opacity-100" : "text-muted-foreground opacity-80 group-hover:opacity-100"
            )}>
              Ôn thi
            </span>
          </button>

          {/* ICON 3: CENTER ICON - USER / TÀI KHOẢN (POPUP USER MENU) */}
          <button
            type="button"
            onClick={() => {
              setExamMenuOpen(false)
              setUserMenuOpen(!userMenuOpen)
            }}
            className="relative flex-1 flex flex-col items-center justify-center py-1 px-1 transition-all duration-300 min-h-[48px] rounded-2xl group outline-none active:scale-95 select-none cursor-pointer"
          >
            {(isUserActive || userMenuOpen) && (
              <div className="absolute inset-0 bg-primary/10 rounded-2xl shadow-xs border border-primary/20 -z-10 transition-all duration-200" />
            )}
            <div className={cn(
              "relative flex items-center justify-center transition-all duration-300",
              (isUserActive || userMenuOpen) ? "scale-110 mb-0.5" : ""
            )}>
              {hasAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user?.avatarUrl}
                  alt={user?.name || 'User'}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className={cn(
                    "w-6 h-6 rounded-full object-cover ring-2 transition-all",
                    (isUserActive || userMenuOpen) ? "ring-primary" : "ring-border"
                  )}
                />
              ) : user ? (
                <div className={cn(
                  "w-6 h-6 rounded-full bg-primary text-primary-foreground font-black text-[10px] flex items-center justify-center shadow-xs ring-2 transition-all",
                  (isUserActive || userMenuOpen) ? "ring-primary" : "ring-border"
                )}>
                  {initial}
                </div>
              ) : (
                <User className={cn("w-[20px] h-[20px]", (isUserActive || userMenuOpen) ? "text-primary stroke-[2.5px]" : "text-muted-foreground stroke-2")} />
              )}
            </div>
            <span className={cn(
              "text-[9px] sm:text-[10px] font-black tracking-tight text-center leading-none transition-all duration-300 mt-0.5 whitespace-nowrap",
              (isUserActive || userMenuOpen) ? "text-primary opacity-100" : "text-muted-foreground opacity-80 group-hover:opacity-100"
            )}>
              Tài khoản
            </span>
          </button>

          {/* ICON 4: LỚP HỌC */}
          <Link
            href={classroomHref}
            prefetch={false}
            onClick={closeAllMenus}
            className="relative flex-1 flex flex-col items-center justify-center py-1.5 px-1 transition-all duration-300 min-h-[48px] rounded-2xl group outline-none active:scale-95 select-none"
          >
            {isClassroomActive && (
              <div className="absolute inset-0 bg-primary/10 rounded-2xl shadow-xs border border-primary/20 -z-10 transition-all duration-200" />
            )}
            <div className={cn(
              "relative flex items-center justify-center transition-all duration-300",
              isClassroomActive ? "text-primary scale-110 mb-0.5" : "text-muted-foreground group-hover:text-foreground"
            )}>
              {isClassroomActive && <div className="absolute inset-0 bg-primary/25 blur-md rounded-full -z-10" />}
              {isTeacherRole ? (
                <School className={cn("w-[20px] h-[20px]", isClassroomActive ? "stroke-[2.5px]" : "stroke-2")} />
              ) : (
                <GraduationCap className={cn("w-[20px] h-[20px]", isClassroomActive ? "stroke-[2.5px]" : "stroke-2")} />
              )}
            </div>
            <span className={cn(
              "text-[9px] sm:text-[10px] font-black tracking-tight text-center leading-none transition-all duration-300 mt-0.5 whitespace-nowrap",
              isClassroomActive ? "text-primary opacity-100" : "text-muted-foreground opacity-80 group-hover:opacity-100"
            )}>
              Lớp học
            </span>
          </Link>

          {/* ICON 5: CỘNG ĐỒNG */}
          <Link
            href="/community"
            prefetch={false}
            onClick={closeAllMenus}
            className="relative flex-1 flex flex-col items-center justify-center py-1.5 px-1 transition-all duration-300 min-h-[48px] rounded-2xl group outline-none active:scale-95 select-none"
          >
            {isCommunityActive && (
              <div className="absolute inset-0 bg-primary/10 rounded-2xl shadow-xs border border-primary/20 -z-10 transition-all duration-200" />
            )}
            <div className={cn(
              "relative flex items-center justify-center transition-all duration-300",
              isCommunityActive ? "text-primary scale-110 mb-0.5" : "text-muted-foreground group-hover:text-foreground"
            )}>
              {isCommunityActive && <div className="absolute inset-0 bg-primary/25 blur-md rounded-full -z-10" />}
              <Users className={cn("w-[20px] h-[20px]", isCommunityActive ? "stroke-[2.5px]" : "stroke-2")} />
            </div>
            <span className={cn(
              "text-[9px] sm:text-[10px] font-black tracking-tight text-center leading-none transition-all duration-300 mt-0.5 whitespace-nowrap",
              isCommunityActive ? "text-primary opacity-100" : "text-muted-foreground opacity-80 group-hover:opacity-100"
            )}>
              Cộng đồng
            </span>
          </Link>
        </nav>
      </div>
    </>
  )
}
