'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useQueryClient } from '@tanstack/react-query'
import type { AuthResponse } from '@/hooks/auth/useAuth'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useToast } from '@/store/shared/toast-store'
import { cn } from '@/lib/core/utils/cn'
import {
  Home,
  BookCheck,
  User,
  GraduationCap,
  Users,
  type LucideIcon,
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

interface MobileNavTabProps {
  label: string
  icon: LucideIcon
  active: boolean
  onClick: () => void
  href?: string
  buttonLabel?: string
  expanded?: boolean
  triggerRef?: React.Ref<HTMLButtonElement>
}

function MobileNavTab({
  label,
  icon: Icon,
  active,
  onClick,
  href,
  buttonLabel,
  expanded,
  triggerRef,
}: MobileNavTabProps) {
  const content = (
    <>
      <div className="relative">
        <Icon aria-hidden="true" className={cn('w-5 h-5 transition-transform', active && 'scale-110')} />
        {active && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
      </div>
      <span>{label}</span>
    </>
  )
  const className = cn(
    'flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 text-[10px] font-extrabold transition-all relative select-none active:scale-95 cursor-pointer',
    active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
  )

  if (href) {
    return (
      <Link href={href} prefetch={false} onClick={onClick} aria-current={active ? 'page' : undefined} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      aria-label={buttonLabel}
      aria-expanded={expanded}
      aria-haspopup="dialog"
      onClick={onClick}
      className={className}
    >
      {content}
    </button>
  )
}

export function MobileNav({ user }: MobileNavProps) {
  const pathname = usePathname()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [examMenuOpen, setExamMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const examTriggerRef = useRef<HTMLButtonElement>(null)
  const userTriggerRef = useRef<HTMLButtonElement>(null)

  const { theme, setTheme } = useTheme()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const themeRequestRef = useRef(0)
  const selectedThemeRef = useRef(theme ?? 'light')

  useEffect(() => {
    selectedThemeRef.current = theme ?? 'light'
  }, [theme])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const closeAtDesktop = () => {
      if (media.matches) {
        setExamMenuOpen(false)
        setUserMenuOpen(false)
      }
    }
    media.addEventListener('change', closeAtDesktop)
    closeAtDesktop()
    return () => media.removeEventListener('change', closeAtDesktop)
  }, [])

  const handleThemeChange = async (newTheme: string) => {
    const previousTheme = selectedThemeRef.current
    if (newTheme === previousTheme) return

    const requestId = ++themeRequestRef.current
    selectedThemeRef.current = newTheme
    setTheme(newTheme)
    if (!user) return

    try {
      const response = await fetch('/api/v1/user/theme', {
        method: 'PUT',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ theme: newTheme }),
      })
      if (!response.ok) throw new Error('Could not save your theme preference. Try again.')

      const data = await response.json()
      if (requestId !== themeRequestRef.current) return

      const savedTheme = data.themePreference ?? data.theme ?? newTheme
      if (savedTheme !== selectedThemeRef.current) {
        selectedThemeRef.current = savedTheme
        setTheme(savedTheme)
      }
      queryClient.setQueryData<AuthResponse | undefined>(['auth-user'], (current) => current?.user ? {
        ...current,
        user: { ...current.user, themePreference: savedTheme, theme_preference: savedTheme },
      } : current)
    } catch (error) {
      if (requestId !== themeRequestRef.current) return
      selectedThemeRef.current = previousTheme
      setTheme(previousTheme)
      toast.error(error)
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
  const navTabs: MobileNavTabProps[] = [
    { label: 'Home', icon: Home, active: isHomeActive, href: '/', onClick: closeAllMenus },
    {
      label: 'Practice', icon: BookCheck, active: isExamActive || examMenuOpen,
      buttonLabel: 'Open practice menu', expanded: examMenuOpen, triggerRef: examTriggerRef,
      onClick: () => { setUserMenuOpen(false); setExamMenuOpen((prev) => !prev) },
    },
    { label: 'Classroom', icon: GraduationCap, active: isClassroomActive, href: classroomHref, onClick: closeAllMenus },
    { label: 'Community', icon: Users, active: isCommunityActive, href: '/community', onClick: closeAllMenus },
    {
      label: 'Account', icon: User, active: isUserActive || userMenuOpen,
      buttonLabel: 'Open account menu', expanded: userMenuOpen, triggerRef: userTriggerRef,
      onClick: () => { setExamMenuOpen(false); setUserMenuOpen((prev) => !prev) },
    },
  ]

  return (
    <>

      {/* BOTTOM SHEET 1: QUIZ / PRACTICE */}
      <MobileNavExamSheet
        open={examMenuOpen}
        pathname={pathname}
        user={user}
        onClose={closeAllMenus}
        triggerRef={examTriggerRef}
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
        triggerRef={userTriggerRef}
      />

      {/* MAIN FIXED BOTTOM NAV BAR */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur-xl border-t border-border/80 z-40 lg:hidden transition-all duration-300 pb-safe-area-bottom shadow-mobile-nav"
      >
        <div className="flex items-center justify-around h-16 px-1.5 max-w-md mx-auto">
          {navTabs.map((tab) => <MobileNavTab key={tab.label} {...tab} />)}
        </div>
      </nav>
    </>
  )
}
