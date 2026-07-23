'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/core/utils/cn'
import { 
  Home, 
  BookCheck, 
  Compass, 
  FileText, 
  Clock, 
  User, 
  Settings, 
  LogOut, 
  LogIn, 
  UserPlus, 
  GraduationCap, 
  School, 
  Users, 
  ChevronRight,
  X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLogout } from '@/hooks/useLogout'

interface MobileNavProps {
  user?: { _id?: string; name: string; role: string; avatarUrl?: string } | null
}

export function MobileNav({ user }: MobileNavProps) {
  const pathname = usePathname()
  const { handleLogout } = useLogout()
  
  const [examMenuOpen, setExamMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [avatarError, setAvatarError] = useState(false)

  // Hide mobile nav on quiz session screens or full-screen session modes
  if (pathname?.includes('/session/') || pathname?.includes('/flashcard/')) {
    return null
  }

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'dev'
  const isTeacherRole = user?.role === 'teacher'
  const initial = (user?.name || 'U').charAt(0).toUpperCase()
  const hasAvatar = !!user?.avatarUrl && !avatarError

  const roleLabel = user?.role === 'admin'
    ? 'Quản trị viên'
    : user?.role === 'dev'
    ? 'Developer'
    : user?.role === 'teacher'
    ? 'Giáo viên'
    : 'Học viên'

  const classroomHref = isTeacherOrAdmin ? '/teacher/classrooms' : '/student/classrooms'

  const closeAllMenus = () => {
    setExamMenuOpen(false)
    setUserMenuOpen(false)
  }

  // Active route checks
  const isHomeActive = pathname === '/dashboard' || (pathname === '/' && !user)
  const isExamActive = pathname === '/explore' || pathname === '/my-quizzes' || pathname === '/history' || pathname?.startsWith('/courses') || pathname?.startsWith('/quiz')
  const isUserActive = pathname === '/profile' || pathname === '/settings' || pathname === '/login' || pathname === '/register'
  const isClassroomActive = pathname?.startsWith('/student/classrooms') || pathname?.startsWith('/teacher')
  const isCommunityActive = pathname?.startsWith('/community')

  return (
    <>
      {/* ─── BACKDROP OVERLAY WHEN POPUP MENU IS OPEN ───────────────── */}
      <AnimatePresence>
        {(examMenuOpen || userMenuOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAllMenus}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* ─── BOTTOM NAVBAR CONTAINER ──────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md animate-in slide-in-from-bottom-6 duration-500 fade-in-0 pb-[env(safe-area-inset-bottom)]">
        
        {/* ─── POPUP MENU 1: ÔN THI TRẮC NGHIỆM (ATTACHED BLOCK ABOVE NAVBAR) ── */}
        <AnimatePresence>
          {examMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute bottom-[calc(100%+12px)] inset-x-0 w-full bg-white/95 backdrop-blur-2xl border border-white/90 rounded-[2.2rem] shadow-[0_20px_50px_rgba(0,0,0,0.22)] p-3 space-y-1.5 overflow-hidden z-50"
            >
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#5D7B6F]">
                  Ôn thi trắc nghiệm
                </span>
                <button
                  type="button"
                  onClick={closeAllMenus}
                  className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
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
                    ? "bg-[#5D7B6F] text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100/80"
                )}
              >
                <Compass className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                <span>Khám phá đề thi</span>
              </Link>

              <Link
                href="/my-quizzes"
                prefetch={false}
                onClick={closeAllMenus}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all active:scale-98",
                  pathname === '/my-quizzes' || pathname?.startsWith('/create')
                    ? "bg-[#5D7B6F] text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100/80"
                )}
              >
                <FileText className="w-4.5 h-4.5 text-blue-500 shrink-0" />
                <span>Bộ đề của tôi</span>
              </Link>

              <Link
                href="/history"
                prefetch={false}
                onClick={closeAllMenus}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all active:scale-98",
                  pathname === '/history'
                    ? "bg-[#5D7B6F] text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100/80"
                )}
              >
                <Clock className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                <span>Lịch sử làm bài</span>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── POPUP MENU 2: TÀI KHOẢN (ATTACHED BLOCK ABOVE NAVBAR) ───────── */}
        <AnimatePresence>
          {userMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute bottom-[calc(100%+12px)] inset-x-0 w-full bg-white/95 backdrop-blur-2xl border border-white/90 rounded-[2.2rem] shadow-[0_20px_50px_rgba(0,0,0,0.22)] p-3 space-y-1.5 overflow-hidden z-50"
            >
              {user ? (
                <>
                  <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-3 min-w-0">
                      {hasAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          referrerPolicy="no-referrer"
                          onError={() => setAvatarError(true)}
                          className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#5D7B6F]/30 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#5D7B6F] text-white flex items-center justify-center font-black text-base shrink-0 shadow-xs">
                          {initial}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-slate-900 truncate">{user.name}</span>
                        <span className="text-[10px] font-extrabold text-[#5D7B6F] uppercase tracking-wider">
                          {roleLabel}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeAllMenus}
                      className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 shadow-xs shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Link
                    href="/profile"
                    prefetch={false}
                    onClick={closeAllMenus}
                    className="flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-100/80 transition-colors active:scale-98"
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="w-4.5 h-4.5 text-emerald-600" />
                      <span>Trang cá nhân</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>

                  <Link
                    href="/settings"
                    prefetch={false}
                    onClick={closeAllMenus}
                    className="flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-100/80 transition-colors active:scale-98"
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="w-4.5 h-4.5 text-slate-600" />
                      <span>Cài đặt tài khoản</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      closeAllMenus()
                      handleLogout()
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer active:scale-98"
                  >
                    <div className="flex items-center gap-2.5">
                      <LogOut className="w-4.5 h-4.5 text-rose-600" />
                      <span>Đăng xuất</span>
                    </div>
                  </button>
                </>
              ) : (
                <>
                  <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-600">Tài khoản FQuiz</span>
                    <button
                      type="button"
                      onClick={closeAllMenus}
                      className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Link
                    href="/login"
                    prefetch={false}
                    onClick={closeAllMenus}
                    className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl text-xs font-black bg-[#5D7B6F] text-white shadow-xs text-center active:scale-98"
                  >
                    <LogIn className="w-4.5 h-4.5" />
                    <span>Đăng nhập</span>
                  </Link>

                  <Link
                    href="/register"
                    prefetch={false}
                    onClick={closeAllMenus}
                    className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl text-xs font-black bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-center active:scale-98"
                  >
                    <UserPlus className="w-4.5 h-4.5" />
                    <span>Đăng ký tài khoản</span>
                  </Link>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── BOTTOM DOCK BAR ────────────────────────────────────────── */}
        <div className="absolute -inset-1.5 bg-gradient-to-r from-[#5D7B6F]/20 via-[#A4C3A2]/20 to-[#5D7B6F]/20 rounded-[2.2rem] blur-lg opacity-70 pointer-events-none" />

        <div className="relative bg-white/90 backdrop-blur-2xl border border-white/80 rounded-[2.2rem] shadow-[0_10px_35px_rgba(0,0,0,0.12)] p-1.5 flex items-center justify-between gap-1 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-90" />

          {/* ICON 1: TRANG CHỦ (/dashboard) */}
          <Link
            href={user ? "/dashboard" : "/"}
            prefetch={false}
            onClick={closeAllMenus}
            className="relative flex-1 flex flex-col items-center justify-center py-1.5 px-1 transition-all duration-300 min-h-[48px] rounded-2xl group outline-none active:scale-95 select-none"
          >
            {isHomeActive && (
              <motion.div
                layoutId="mobile-nav-active"
                className="absolute inset-0 bg-[#5D7B6F]/10 rounded-2xl shadow-xs border border-[#5D7B6F]/20 -z-10"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <div className={cn(
              "relative flex items-center justify-center transition-all duration-300",
              isHomeActive ? "text-[#5D7B6F] scale-110 mb-0.5" : "text-slate-400 group-hover:text-slate-600"
            )}>
              {isHomeActive && <div className="absolute inset-0 bg-[#5D7B6F]/25 blur-md rounded-full -z-10" />}
              <Home className={cn("w-[20px] h-[20px]", isHomeActive ? "stroke-[2.5px]" : "stroke-2")} />
            </div>
            <span className={cn(
              "text-[9px] sm:text-[10px] font-black tracking-tight text-center leading-none transition-all duration-300 mt-0.5 whitespace-nowrap",
              isHomeActive ? "text-[#5D7B6F] opacity-100" : "text-slate-400 opacity-80 group-hover:opacity-100"
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
              <motion.div
                layoutId="mobile-nav-active"
                className="absolute inset-0 bg-[#5D7B6F]/10 rounded-2xl shadow-xs border border-[#5D7B6F]/20 -z-10"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <div className={cn(
              "relative flex items-center justify-center transition-all duration-300",
              (isExamActive || examMenuOpen) ? "text-[#5D7B6F] scale-110 mb-0.5" : "text-slate-400 group-hover:text-slate-600"
            )}>
              {(isExamActive || examMenuOpen) && <div className="absolute inset-0 bg-[#5D7B6F]/25 blur-md rounded-full -z-10" />}
              <BookCheck className={cn("w-[20px] h-[20px]", (isExamActive || examMenuOpen) ? "stroke-[2.5px]" : "stroke-2")} />
            </div>
            <span className={cn(
              "text-[9px] sm:text-[10px] font-black tracking-tight text-center leading-none transition-all duration-300 mt-0.5 whitespace-nowrap",
              (isExamActive || examMenuOpen) ? "text-[#5D7B6F] opacity-100" : "text-slate-400 opacity-80 group-hover:opacity-100"
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
              <motion.div
                layoutId="mobile-nav-active"
                className="absolute inset-0 bg-[#5D7B6F]/10 rounded-2xl shadow-xs border border-[#5D7B6F]/20 -z-10"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
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
                    (isUserActive || userMenuOpen) ? "ring-[#5D7B6F]" : "ring-slate-300"
                  )}
                />
              ) : user ? (
                <div className={cn(
                  "w-6 h-6 rounded-full bg-[#5D7B6F] text-white font-black text-[10px] flex items-center justify-center shadow-xs ring-2 transition-all",
                  (isUserActive || userMenuOpen) ? "ring-[#5D7B6F]" : "ring-slate-200"
                )}>
                  {initial}
                </div>
              ) : (
                <User className={cn("w-[20px] h-[20px]", (isUserActive || userMenuOpen) ? "text-[#5D7B6F] stroke-[2.5px]" : "text-slate-400 stroke-2")} />
              )}
            </div>
            <span className={cn(
              "text-[9px] sm:text-[10px] font-black tracking-tight text-center leading-none transition-all duration-300 mt-0.5 whitespace-nowrap",
              (isUserActive || userMenuOpen) ? "text-[#5D7B6F] opacity-100" : "text-slate-400 opacity-80 group-hover:opacity-100"
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
              <motion.div
                layoutId="mobile-nav-active"
                className="absolute inset-0 bg-[#5D7B6F]/10 rounded-2xl shadow-xs border border-[#5D7B6F]/20 -z-10"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <div className={cn(
              "relative flex items-center justify-center transition-all duration-300",
              isClassroomActive ? "text-[#5D7B6F] scale-110 mb-0.5" : "text-slate-400 group-hover:text-slate-600"
            )}>
              {isClassroomActive && <div className="absolute inset-0 bg-[#5D7B6F]/25 blur-md rounded-full -z-10" />}
              {isTeacherRole ? (
                <School className={cn("w-[20px] h-[20px]", isClassroomActive ? "stroke-[2.5px]" : "stroke-2")} />
              ) : (
                <GraduationCap className={cn("w-[20px] h-[20px]", isClassroomActive ? "stroke-[2.5px]" : "stroke-2")} />
              )}
            </div>
            <span className={cn(
              "text-[9px] sm:text-[10px] font-black tracking-tight text-center leading-none transition-all duration-300 mt-0.5 whitespace-nowrap",
              isClassroomActive ? "text-[#5D7B6F] opacity-100" : "text-slate-400 opacity-80 group-hover:opacity-100"
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
              <motion.div
                layoutId="mobile-nav-active"
                className="absolute inset-0 bg-[#5D7B6F]/10 rounded-2xl shadow-xs border border-[#5D7B6F]/20 -z-10"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <div className={cn(
              "relative flex items-center justify-center transition-all duration-300",
              isCommunityActive ? "text-[#5D7B6F] scale-110 mb-0.5" : "text-slate-400 group-hover:text-slate-600"
            )}>
              {isCommunityActive && <div className="absolute inset-0 bg-[#5D7B6F]/25 blur-md rounded-full -z-10" />}
              <Users className={cn("w-[20px] h-[20px]", isCommunityActive ? "stroke-[2.5px]" : "stroke-2")} />
            </div>
            <span className={cn(
              "text-[9px] sm:text-[10px] font-black tracking-tight text-center leading-none transition-all duration-300 mt-0.5 whitespace-nowrap",
              isCommunityActive ? "text-[#5D7B6F] opacity-100" : "text-slate-400 opacity-80 group-hover:opacity-100"
            )}>
              Cộng đồng
            </span>
          </Link>
        </div>
      </div>
    </>
  )
}
