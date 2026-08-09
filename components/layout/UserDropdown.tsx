'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { User, LogOut, Settings, ChevronDown, Sparkles, School, GraduationCap, Sun, Moon, Monitor, Palette } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/shared/ui/dropdown-menu'
import { Check } from 'lucide-react'

import { useLogout } from '@/hooks/useLogout'
import { cn } from '@/lib/core/utils/cn'

interface UserDropdownProps {
  user: { name: string; role: string; avatarUrl?: string }
  compact?: boolean
  fullCard?: boolean
}

export function UserDropdown({ user, compact = false, fullCard = false }: UserDropdownProps) {
  const pathname = usePathname()
  const [avatarError, setAvatarError] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { handleLogout } = useLogout()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    fetch('/api/v1/user/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: newTheme }),
    }).catch(() => { })
  }

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
            className="w-full flex items-center justify-between bg-card p-2.5 rounded-2xl border border-border shadow-2xs hover:bg-muted/50 transition-all cursor-pointer text-left outline-none focus:outline-none"
          >
            <div className="flex items-center gap-2.5 min-w-0 text-left">
              {hasAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className="w-9 h-9 rounded-xl object-cover ring-2 ring-background shadow-xs shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                  {initial}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black text-foreground truncate">{user.name}</span>
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                  {roleLabel}
                </span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
          </button>
        ) : (
          <button
            type="button"
            className={
              compact
                ? "flex items-center justify-center p-1 hover:bg-muted rounded-full transition-all cursor-pointer outline-none focus:outline-none"
                : "flex items-center gap-2 p-1.5 pr-3 hover:bg-muted rounded-full border border-border transition-all cursor-pointer max-w-full outline-none focus:outline-none bg-card shadow-2xs"
            }
          >
            {hasAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-background shadow-xs shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-[13px] ring-2 ring-background shadow-xs shrink-0">
                {initial}
              </div>
            )}

            {!compact && (
              <>
                <div className="flex flex-col text-left mr-0.5 max-w-[110px] truncate">
                  <p className="text-[12px] font-black text-foreground leading-tight tracking-tight truncate">
                    {user.name}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </>
            )}
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "center" : "end"} sideOffset={8} className="w-64 p-0 bg-card border-border rounded-2xl shadow-2xl shadow-black/8 overflow-hidden z-50">
        {/* User info header */}
        <div className="px-4 py-4 bg-muted/60 border-b border-border">
          <div className="flex items-center gap-3">
            {hasAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-background shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-sm ring-2 ring-background shadow-sm">
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-foreground truncate">{user.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
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
              <Link href="/admin" prefetch={false} className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-xl font-semibold text-foreground hover:text-primary transition-colors whitespace-nowrap">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-bold truncate">Bảng điều khiển Admin</span>
              </Link>
            </DropdownMenuItem>
          )}

          {isTeacher && (
            isTeacherRoute ? (
              <DropdownMenuItem asChild>
                <Link href="/dashboard" prefetch={false} className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-xl font-semibold text-foreground hover:text-primary transition-colors whitespace-nowrap">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                    <GraduationCap className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-bold truncate">Trang Học viên</span>
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild>
                <Link href="/teacher/classrooms" prefetch={false} className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-xl font-semibold text-foreground hover:text-primary transition-colors whitespace-nowrap">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                    <School className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-bold truncate">Trang Giáo viên</span>
                </Link>
              </DropdownMenuItem>
            )
          )}

          <DropdownMenuItem asChild>
            <Link href="/profile" prefetch={false} className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-xl font-semibold text-foreground hover:text-primary transition-colors">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm">Trang cá nhân</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href={isAdmin ? '/admin/settings' : '/settings'} prefetch={false} className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-xl font-semibold text-foreground hover:text-primary transition-colors">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                <Settings className="w-4 h-4" />
              </div>
              <span className="text-sm">Cài đặt</span>
            </Link>
          </DropdownMenuItem>
        </div>

        {/* Theme Switcher section */}
        {mounted && (
          <div className="border-t border-border p-1">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-3 cursor-pointer py-2 px-2.5 rounded-xl font-semibold text-foreground hover:text-primary transition-colors focus:bg-muted data-[state=open]:bg-muted">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  {theme === 'dark' ? (
                    <Moon className="w-4 h-4 text-primary" />
                  ) : theme === 'green' ? (
                    <Palette className="w-4 h-4 text-primary" />
                  ) : (
                    <Sun className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-sm font-semibold truncate">Giao diện</span>
                  <span className="text-[10px] text-muted-foreground font-bold truncate">
                    {theme === 'dark' ? 'Giao diện Tối' : theme === 'green' ? 'Giao diện Xanh' : 'Giao diện Sáng'}
                  </span>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent sideOffset={8} className="w-56 p-1.5 bg-card border-border rounded-2xl shadow-xl z-50">
                <DropdownMenuItem
                  onClick={() => handleThemeChange('light')}
                  className={cn(
                    "flex items-center justify-between cursor-pointer py-2.5 px-3 rounded-xl font-semibold text-xs transition-colors",
                    theme === 'light' ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Sun className="w-4 h-4 text-primary" />
                    <span>Giao diện Sáng</span>
                  </div>
                  {theme === 'light' && <Check className="w-4 h-4 text-primary" />}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleThemeChange('dark')}
                  className={cn(
                    "flex items-center justify-between cursor-pointer py-2.5 px-3 rounded-xl font-semibold text-xs transition-colors",
                    theme === 'dark' ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Moon className="w-4 h-4 text-primary" />
                    <span>Giao diện Tối</span>
                  </div>
                  {theme === 'dark' && <Check className="w-4 h-4 text-primary" />}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleThemeChange('green')}
                  className={cn(
                    "flex items-center justify-between cursor-pointer py-2.5 px-3 rounded-xl font-semibold text-xs transition-colors",
                    theme === 'green' ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Palette className="w-4 h-4 text-primary" />
                    <span>Giao diện Xanh</span>
                  </div>
                  {theme === 'green' && <Check className="w-4 h-4 text-primary" />}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </div>
        )}

        {/* Logout section */}
        <div className="border-t border-border p-1.5">
          <DropdownMenuItem
            className="flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-xl font-semibold text-muted-foreground hover:text-destructive focus:text-destructive transition-colors"
            onClick={() => handleLogout('/')}
          >
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold">Đăng xuất</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
