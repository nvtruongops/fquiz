'use client'

import React from 'react'
import Link from 'next/link'
import { User, LogOut, Settings, ChevronDown } from 'lucide-react'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface UserDropdownProps {
  user: { name: string; role: string; avatarUrl?: string }
}

export function UserDropdown({ user }: UserDropdownProps) {
  const handleLogout = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/logout`, { method: 'POST' }).then(() => {
      globalThis.location.href = '/'
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 p-1 hover:bg-[#5D7B6F]/5 rounded-full transition-all">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt="avatar"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-md"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#A4C3A2] flex items-center justify-center text-[#5D7B6F] font-black text-[13px] ring-2 ring-white shadow-md">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="hidden sm:block text-left mr-0.5">
            <p className="text-[11px] font-black text-[#5D7B6F] leading-tight tracking-tight">{user.name}</p>
          </div>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1 border-[#5D7B6F]/10 rounded-2xl shadow-xl">
        <div className="px-3 py-3 sm:hidden">
          <p className="text-[13px] font-black text-[#5D7B6F]">{user.name}</p>
        </div>
        <DropdownMenuSeparator className="sm:hidden" />
        <DropdownMenuItem asChild>
          <Link href={user.role === 'admin' ? '/admin' : '/profile'} className="flex items-center gap-2 cursor-pointer py-2.5 rounded-xl font-bold text-gray-600">
            <User className="w-4 h-4" />
            <span>Trang cá nhân</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={user.role === 'admin' ? '/admin/settings' : '/settings'} className="flex items-center gap-2 cursor-pointer py-2.5 rounded-xl font-bold text-gray-600">
            <Settings className="w-4 h-4" />
            <span>Cài đặt</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-red-500 focus:text-red-500 flex items-center gap-2 cursor-pointer py-2.5 rounded-xl font-black"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
