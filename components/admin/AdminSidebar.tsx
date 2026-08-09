'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  BookOpen, LayoutDashboard, Layers, FileQuestion,
  LogOut, Users, Settings, MessageSquare, Menu, X,
  Database, Sparkles,
} from 'lucide-react'
import { clearAllUserCache } from '@/lib/core/utils/cache-invalidation'
import { cn } from '@/lib/core/utils/cn'

const navItems = [
  { href: '/admin',                      label: 'Dashboard',           icon: LayoutDashboard, exact: true },
  { href: '/admin/ai-usage',             label: 'Quản lý AI Token',    icon: Sparkles,        exact: false },
  { href: '/admin/categories',           label: 'Categories',          icon: Layers,          exact: false },
  { href: '/admin/quizzes',              label: 'Quizzes',             icon: FileQuestion,    exact: false },
  { href: '/admin/question-bank',        label: 'Ngân hàng câu hỏi',   icon: Database,        exact: false },
  { href: '/admin/users',                label: 'Học viên',            icon: Users,           exact: false },
  { href: '/admin/feedback',             label: 'Góp ý',               icon: MessageSquare,   exact: false },
  { href: '/admin/settings',             label: 'Cài đặt',             icon: Settings,        exact: false },
]

function SidebarContent({
  pathname,
  onNavigate,
  onLogout,
}: {
  pathname: string
  onNavigate?: () => void
  onLogout: () => void
}) {
  return (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <Link href="/admin" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-primary text-sm tracking-tight">FQuiz Admin</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={onLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>
    </>
  )
}

import { useLogout } from '@/hooks/useLogout'

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { handleLogout: triggerLogout } = useLogout()

  function handleLogout() {
    triggerLogout('/login')
  }

  return (
    <>
      {/* ── Desktop sidebar (≥ md) ── */}
      <aside className="hidden md:flex w-56 bg-card border-r border-border flex-col fixed h-full z-10 text-card-foreground">
        <SidebarContent pathname={pathname} onLogout={handleLogout} />
      </aside>

      {/* ── Mobile top bar (< md) ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-card border-b border-border flex items-center justify-between px-4 h-14 text-card-foreground">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-primary text-sm tracking-tight">FQuiz Admin</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-background/80 backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
          role="presentation"
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
              setMobileOpen(false)
            }
          }}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={cn(
          'md:hidden fixed top-0 left-0 h-full w-64 bg-card text-card-foreground border-r border-border z-40 flex flex-col transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-end px-4 py-3 border-b border-border">
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent
          pathname={pathname}
          onNavigate={() => setMobileOpen(false)}
          onLogout={handleLogout}
        />
      </aside>
    </>
  )
}
