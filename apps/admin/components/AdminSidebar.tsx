'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ShieldCheck, LayoutDashboard, Layers, FileQuestion,
  LogOut, Users, Settings, MessageSquare, Menu, X,
  Database,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const navItems = [
  { href: '/',               label: 'Dashboard',           icon: LayoutDashboard, exact: true },
  { href: '/categories',     label: 'Categories',          icon: Layers,          exact: false },
  { href: '/quizzes',        label: 'Quizzes',             icon: FileQuestion,    exact: false },
  { href: '/question-bank',  label: 'Ngân hàng câu hỏi',   icon: Database,        exact: false },
  { href: '/users',          label: 'Học viên',            icon: Users,           exact: false },
  { href: '/feedback',       label: 'Góp ý',               icon: MessageSquare,   exact: false },
  { href: '/settings',       label: 'Cài đặt',             icon: Settings,        exact: false },
]

interface AdminSidebarProps {
  user?: {
    username: string
    email?: string
    role: string
  }
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  function renderNavLinks(onNavigate?: () => void) {
    return (
      <>
        <div className="px-5 py-5 border-b border-border flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" onClick={onNavigate}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-foreground text-sm tracking-tight block">FQuiz Admin</span>
              <span className="text-[10px] text-muted-foreground font-mono block">Zero Trust Portal</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-3 border-t border-border space-y-2">
          {user && (
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-muted/40 border border-border/50">
              <div className="w-7 h-7 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center border border-primary/30 text-xs shrink-0">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-foreground truncate">{user.username}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-mono">{user.role}</div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 bg-card border-r border-border flex-col fixed h-full z-20 text-card-foreground">
        {renderNavLinks()}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border flex items-center justify-between px-4 z-30">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-bold text-foreground text-sm">FQuiz Admin</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 bg-card border-r border-border flex flex-col h-full z-50">
            {renderNavLinks(() => setMobileOpen(false))}
          </aside>
        </div>
      )}
    </>
  )
}
