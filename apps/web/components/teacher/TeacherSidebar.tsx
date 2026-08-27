'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { School, FileText } from 'lucide-react'
import { FQuizLogo } from '@/components/shared/ui/FQuizLogo'
import { UserDropdown } from '@/components/layout/UserDropdown'
import { cn } from '@/lib/core/utils/cn'

interface TeacherSidebarProps {
  user?: { _id?: string; name: string; role: string; avatarUrl?: string } | null
}

export function TeacherSidebar({ user }: TeacherSidebarProps) {
  const pathname = usePathname()

  const navItems = [
    {
      label: 'Quản lý Lớp học',
      href: '/teacher/classrooms',
      icon: School,
      description: 'Danh sách lớp, học viên & bài tập',
    },
    {
      label: 'Quản lý Đề thi',
      href: '/teacher/quizzes',
      icon: FileText,
      description: 'Tạo & quản lý các bộ đề trắc nghiệm',
    },
  ]

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0 shrink-0 shadow-sm z-40">
      {/* Header / Brand */}
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <FQuizLogo size={32} />
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-widest text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 w-fit">
              TEACHER PANEL
            </span>
          </div>
        </div>
      </div>

      {/* Navigation section */}
      <div className="flex-1 px-3 py-6 space-y-6 overflow-y-auto">
        <div className="space-y-1">
          <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-primary block mb-2 opacity-80">
            GIẢNG DẠY & QUẢN LÝ
          </span>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 group relative',
                  isActive
                    ? 'bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20'
                    : 'text-foreground hover:text-primary hover:bg-primary/10 font-semibold'
                )}
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0',
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary group-hover:bg-primary/20'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs tracking-tight truncate">{item.label}</span>
                  {!isActive && (
                    <span className="text-[10px] text-muted-foreground font-normal truncate group-hover:text-primary">
                      {item.description}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Footer / Account card */}
      <div className="p-4 border-t border-border bg-gradient-to-b from-transparent to-muted/30">
        {user ? (
          <UserDropdown user={user} fullCard />
        ) : (
          <Link
            href="/login"
            prefetch={false}
            className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-all"
          >
            Đăng nhập Giáo viên
          </Link>
        )}
      </div>
    </aside>
  )
}
