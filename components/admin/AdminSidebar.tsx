'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  BookOpen, LayoutDashboard, Layers, FileQuestion,
  LogOut, Users, Settings, MessageSquare, Menu, X,
  Database,
} from 'lucide-react'
import { clearAllUserCache } from '@/lib/cache-invalidation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin',                      label: 'Dashboard',           icon: LayoutDashboard, exact: true },
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
      <div className="px-5 py-5 border-b border-[#A4C3A2]/30">
        <Link href="/admin" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="w-7 h-7 rounded-lg bg-[#5D7B6F] flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-[#5D7B6F] text-sm tracking-tight">FQuiz Admin</span>
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
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-[#5D7B6F] text-white'
                  : 'text-gray-600 hover:bg-[#EAE7D6] hover:text-[#5D7B6F]'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-[#A4C3A2]/30">
        <button
          onClick={onLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>
    </>
  )
}

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/logout`, { method: 'POST' })
    clearAllUserCache(queryClient)
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* ── Desktop sidebar (≥ md) ── */}
      <aside className="hidden md:flex w-56 bg-white border-r border-[#A4C3A2]/40 flex-col fixed h-full z-10">
        <SidebarContent pathname={pathname} onLogout={handleLogout} />
      </aside>

      {/* ── Mobile top bar (< md) ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-white border-b border-[#A4C3A2]/30 flex items-center justify-between px-4 h-14">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#5D7B6F] flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-[#5D7B6F] text-sm tracking-tight">FQuiz Admin</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-gray-500 hover:bg-[#EAE7D6]"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={cn(
          'md:hidden fixed top-0 left-0 h-full w-64 bg-white z-40 flex flex-col transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-end px-4 py-3 border-b border-[#A4C3A2]/30">
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
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
