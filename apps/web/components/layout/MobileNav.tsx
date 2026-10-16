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
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useLogout } from '@/hooks/useLogout'

const MobileNavExamSheet = dynamic(
  () => import('@/components/layout/MobileNavExamSheet').then((mod) => mod.MobileNavExamSheet),
  { ssr: false }
)
const MobileNavUserSheet = dynamic(
  () => import('@/components/layout/MobileNavUserSheet').then((mod) => mod.MobileNavUserSheet),
  { ssr: false }
)

interface MobileNavProps {
  user?: { name: string; role: string; avatarUrl?: string } | null
}

export function MobileNav({ user }: MobileNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [examMenuOpen, setExamMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

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
  const isExamActive =
    pathname === '/explore' ||
    pathname === '/history' ||
    pathname?.startsWith('/courses')
  const isUserActive = pathname === '/profile' || pathname === '/settings'
  const isTeacherRole = user?.role === 'teacher' || user?.role === 'admin'
  const classroomHref = isTeacherRole ? '/teacher/classrooms' : '/student/classrooms'
  const isClassroomActive =
    pathname?.startsWith('/student/classrooms') || pathname?.startsWith('/teacher/classrooms')
  const isCommunityActive = pathname === '/community'

  return (
    <>

      {/* BOTTOM SHEET 1: QUIZ / PRACTICE */}
      <MobileNavExamSheet
        open={examMenuOpen}
        pathname={pathname}
        user={user}
        onClose={closeAllMenus}
      />

      {/* BOTTOM SHEET 2: USER ACCOUNT */}
      <MobileNavUserSheet
        open={userMenuOpen}
        user={user}
        mounted={mounted}
        theme={theme}
        onThemeChange={handleThemeChange}
        onLogout={handleLogout}
        onClose={closeAllMenus}
      />

      {/* MAIN FIXED BOTTOM NAV BAR */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur-xl border-t border-border/80 z-40 lg:hidden transition-all duration-300 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center justify-around h-16 px-1.5 max-w-md mx-auto">
          {/* TAB 1: Home */}
          <Link
            href="/"
            onClick={closeAllMenus}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 text-[10px] font-extrabold transition-all relative select-none active:scale-95 cursor-pointer',
              isHomeActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="relative">
              <Home aria-hidden="true" className={cn('w-5 h-5 transition-transform', isHomeActive && 'scale-110')} />
              {isHomeActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </div>
            <span>Home</span>
          </Link>

          {/* TAB 2: Practice (Drawer) */}
          <button
            type="button"
            aria-label="Open practice menu"
            aria-expanded={examMenuOpen}
            aria-haspopup="dialog"
            onClick={() => {
              setUserMenuOpen(false)
              setExamMenuOpen((prev) => !prev)
            }}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 text-[10px] font-extrabold transition-all relative select-none active:scale-95 cursor-pointer',
              isExamActive || examMenuOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="relative">
              <BookCheck
                aria-hidden="true"
                className={cn('w-5 h-5 transition-transform', (isExamActive || examMenuOpen) && 'scale-110')}
              />
              {(isExamActive || examMenuOpen) && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </div>
            <span>Practice</span>
          </button>

          {/* TAB 3: Classroom */}
          <Link
            href={classroomHref}
            onClick={closeAllMenus}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 text-[10px] font-extrabold transition-all relative select-none active:scale-95 cursor-pointer',
              isClassroomActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="relative">
              <GraduationCap
                aria-hidden="true"
                className={cn('w-5 h-5 transition-transform', isClassroomActive && 'scale-110')}
              />
              {isClassroomActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </div>
            <span>Classroom</span>
          </Link>

          {/* TAB 4: Community */}
          <Link
            href="/community"
            onClick={closeAllMenus}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 text-[10px] font-extrabold transition-all relative select-none active:scale-95 cursor-pointer',
              isCommunityActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="relative">
              <Users aria-hidden="true" className={cn('w-5 h-5 transition-transform', isCommunityActive && 'scale-110')} />
              {isCommunityActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </div>
            <span>Community</span>
          </Link>

          {/* TAB 5: Account (Drawer) */}
          <button
            type="button"
            aria-label="Open account menu"
            aria-expanded={userMenuOpen}
            aria-haspopup="dialog"
            onClick={() => {
              setExamMenuOpen(false)
              setUserMenuOpen((prev) => !prev)
            }}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 text-[10px] font-extrabold transition-all relative select-none active:scale-95 cursor-pointer',
              isUserActive || userMenuOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="relative">
              <User
                aria-hidden="true"
                className={cn('w-5 h-5 transition-transform', (isUserActive || userMenuOpen) && 'scale-110')}
              />
              {(isUserActive || userMenuOpen) && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </div>
            <span>Account</span>
          </button>
        </div>
      </nav>
    </>
  )
}
