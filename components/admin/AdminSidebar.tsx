'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { BookOpen, LayoutDashboard, Layers, FileQuestion, LogOut, Users, Settings } from 'lucide-react'
import { clearAllUserCache } from '@/lib/cache-invalidation'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/categories', label: 'Categories', icon: Layers, exact: false },
  { href: '/admin/quizzes', label: 'Quizzes', icon: FileQuestion, exact: false },
  { href: '/admin/users', label: 'Học viên', icon: Users, exact: false },
  { href: '/admin/settings', label: 'Cài đặt', icon: Settings, exact: false },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()

  async function handleLogout() {
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/logout`, { method: 'POST' })
    clearAllUserCache(queryClient)
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 bg-white border-r border-[#A4C3A2]/40 flex flex-col fixed h-full z-10">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#A4C3A2]/30">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#5D7B6F] flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-[#5D7B6F] text-sm tracking-tight">FQuiz Admin</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? 'bg-[#5D7B6F] text-white'
                  : 'text-gray-600 hover:bg-[#EAE7D6] hover:text-[#5D7B6F]'
                }`}
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
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  )
}
