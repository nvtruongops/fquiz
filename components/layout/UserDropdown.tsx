'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, LogOut, Settings, ChevronDown, Sparkles, School, GraduationCap } from 'lucide-react'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/shared/ui/dropdown-menu'

import { useLogout } from '@/hooks/useLogout'

interface UserDropdownProps {
  user: { name: string; role: string; avatarUrl?: string }
  compact?: boolean
  fullCard?: boolean
}

export function UserDropdown({ user, compact = false, fullCard = false }: UserDropdownProps) {
  const pathname = usePathname()
  const [avatarError, setAvatarError] = useState(false)
  const { handleLogout } = useLogout()

  const isTeacherRoute = pathname?.startsWith('/teacher')

  const initial = (user.name || 'U').charAt(0).toUpperCase()
  const isAdmin = user.role === 'admin'
  const isDev = user.role === 'dev'
  const isTeacher = user.role === 'teacher'
  const hasAvatar = !!user.avatarUrl && !avatarError

  const roleLabel = isAdmin ? 'Quản trị viên' : isDev ? 'Developer' : isTeacher ? 'Giáo viên' : 'Học viên'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {fullCard ? (
          <button
            type="button"
            className="w-full flex items-center justify-between bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer text-left outline-none focus:outline-none"
          >
            <div className="flex items-center gap-2.5 min-w-0 text-left">
              {hasAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className="w-9 h-9 rounded-xl object-cover ring-2 ring-white shadow-xs shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-[#5D7B6F] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                  {initial}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black text-slate-900 truncate">{user.name}</span>
                <span className="text-[10px] font-bold text-[#5D7B6F] uppercase tracking-wider">
                  {roleLabel}
                </span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          </button>
        ) : (
          <button
            type="button"
            className={
              compact
                ? "flex items-center justify-center p-1 hover:bg-slate-100 rounded-full transition-all cursor-pointer outline-none focus:outline-none"
                : "flex items-center gap-2 p-1.5 pr-3 hover:bg-slate-100 rounded-full border border-slate-200/80 transition-all cursor-pointer max-w-full outline-none focus:outline-none bg-white/80 shadow-2xs"
            }
          >
            {hasAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-xs shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5D7B6F] to-[#4A6359] flex items-center justify-center text-white font-black text-[13px] ring-2 ring-white shadow-xs shrink-0">
                {initial}
              </div>
            )}

            {!compact && (
              <>
                <div className="flex flex-col text-left mr-0.5 max-w-[110px] truncate">
                  <p className="text-[12px] font-black text-slate-800 leading-tight tracking-tight truncate">
                    {user.name}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </>
            )}
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "center" : "end"} sideOffset={8} className="w-64 p-0 border-slate-200/80 rounded-2xl shadow-2xl shadow-black/8 overflow-hidden z-50">
        {/* User info header */}
        <div className="px-4 py-4 bg-gradient-to-br from-[#5D7B6F]/10 to-[#A4C3A2]/20 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {hasAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-white shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5D7B6F] to-[#4A6359] flex items-center justify-center text-white font-black text-sm ring-2 ring-white shadow-sm">
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-900 truncate">{user.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3 text-[#5D7B6F]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5D7B6F]">
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="p-1.5 space-y-0.5">
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/admin" prefetch={false} className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-xl font-semibold text-slate-700 hover:text-primary transition-colors whitespace-nowrap">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-primary font-bold shrink-0">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-bold truncate">Bảng điều khiển Admin</span>
              </Link>
            </DropdownMenuItem>
          )}

          {isTeacher && (
            isTeacherRoute ? (
              <DropdownMenuItem asChild>
                <Link href="/dashboard" prefetch={false} className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-xl font-semibold text-slate-700 hover:text-[#5D7B6F] transition-colors whitespace-nowrap">
                  <div className="w-8 h-8 rounded-lg bg-[#5D7B6F]/10 flex items-center justify-center text-[#5D7B6F] font-bold shrink-0">
                    <GraduationCap className="w-4 h-4 text-[#5D7B6F]" />
                  </div>
                  <span className="text-sm font-bold truncate">Trang Học viên</span>
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild>
                <Link href="/teacher/classrooms" prefetch={false} className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-xl font-semibold text-slate-700 hover:text-[#5D7B6F] transition-colors whitespace-nowrap">
                  <div className="w-8 h-8 rounded-lg bg-[#5D7B6F]/10 flex items-center justify-center text-[#5D7B6F] font-bold shrink-0">
                    <School className="w-4 h-4 text-[#5D7B6F]" />
                  </div>
                  <span className="text-sm font-bold truncate">Trang Giáo viên</span>
                </Link>
              </DropdownMenuItem>
            )
          )}

          <DropdownMenuItem asChild>
            <Link href="/profile" prefetch={false} className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-xl font-semibold text-slate-700 hover:text-primary transition-colors">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm">Trang cá nhân</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href={isAdmin ? '/admin/settings' : '/settings'} prefetch={false} className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-xl font-semibold text-slate-700 hover:text-primary transition-colors">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                <Settings className="w-4 h-4" />
              </div>
              <span className="text-sm">Cài đặt</span>
            </Link>
          </DropdownMenuItem>
        </div>

        {/* Logout section */}
        <div className="border-t border-slate-100 p-1.5">
          <DropdownMenuItem 
            className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-xl font-semibold text-slate-500 hover:text-red-600 focus:text-red-600 transition-colors"
            onClick={() => handleLogout('/')}
          >
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-400">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="text-sm">Đăng xuất</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
