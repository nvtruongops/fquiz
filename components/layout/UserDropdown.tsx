'use client'

import React from 'react'
import Link from 'next/link'
import { User, LogOut, Settings, ChevronDown, Sparkles } from 'lucide-react'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/shared/ui/dropdown-menu'
import { Button } from '@/components/shared/ui/button'

interface UserDropdownProps {
  user: { name: string; role: string; avatarUrl?: string }
  compact?: boolean
}

export function UserDropdown({ user, compact = false }: UserDropdownProps) {
  const handleLogout = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/logout`, { method: 'POST' }).then(() => {
      globalThis.location.href = '/'
    })
  }

  const initial = user.name.charAt(0).toUpperCase()
  const isAdmin = user.role === 'admin'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={
            compact
              ? "flex items-center justify-center p-1 hover:bg-[#5D7B6F]/5 rounded-full transition-all cursor-pointer"
              : "flex items-center gap-2 p-1 pr-2 hover:bg-[#5D7B6F]/5 rounded-full transition-all cursor-pointer"
          }
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt="avatar"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-md flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#A4C3A2] to-[#5D7B6F] flex items-center justify-center text-white font-black text-[13px] ring-2 ring-white shadow-md flex-shrink-0">
              {initial}
            </div>
          )}

          {!compact && (
            <>
              <div className="hidden sm:block text-left mr-0.5 max-w-[100px] truncate">
                <p className="text-[11px] font-black text-[#5D7B6F] leading-tight tracking-tight truncate">{user.name}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "center" : "end"} sideOffset={8} className="w-60 p-0 border-slate-200/80 rounded-2xl shadow-2xl shadow-black/8 overflow-hidden z-50">
        {/* User info header */}
        <div className="px-4 py-4 bg-gradient-to-br from-[#5D7B6F]/5 to-[#A4C3A2]/10 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt="avatar"
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-white shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A4C3A2] to-[#5D7B6F] flex items-center justify-center text-white font-black text-sm ring-2 ring-white shadow-sm">
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-900 truncate">{user.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3 text-[#5D7B6F]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5D7B6F]">
                  {isAdmin ? 'Quản trị viên' : 'Học viên'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="p-1.5">
          <DropdownMenuItem asChild>
            <Link href={isAdmin ? '/admin' : '/profile'} className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-xl font-semibold text-slate-700 hover:text-[#5D7B6F] transition-colors">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm">Trang cá nhân</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={isAdmin ? '/admin/settings' : '/settings'} className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-xl font-semibold text-slate-700 hover:text-[#5D7B6F] transition-colors">
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
            onClick={handleLogout}
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
