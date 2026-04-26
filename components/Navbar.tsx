'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, User, LogOut, Settings, ChevronDown, LayoutDashboard, Library, Compass, Users } from 'lucide-react'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navLinks = [
  { name: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Bộ đề của tôi', href: '/my-quizzes', icon: Library },
  { name: 'Khám phá', href: '/explore', icon: Compass },
  { name: 'Cộng đồng', href: '/community', icon: Users },
]

interface NavbarProps {
  initialUser?: { name: string; role: string; avatarUrl?: string } | null
}

export default function Navbar({ initialUser }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  // Start with initialUser to avoid flash - then sync with server
  const [user, setUser] = useState<{ name: string; role: string; avatarUrl?: string } | null>(initialUser ?? null)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    
    // Sync with server to get fresh data (avatar updates, etc.)
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/me`)
      .then(async (res) => {
        if (res.status === 403) {
          // User is banned
          const data = await res.json()
          if (data.banned) {
            // Redirect to login with banned message
            globalThis.location.href = '/login?reason=account_banned'
          }
          return
        }
        if (!res.ok) return
        const data = (await res.json()) as { user?: { name: string; role: string; avatarUrl?: string } | null }
        setUser(data.user ?? null)
      })
      .catch(() => {})

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <nav className={cn(
        "sticky top-0 z-50 transition-all duration-300 w-full",
        isScrolled ? "bg-white/80 backdrop-blur-xl border-b border-[#5D7B6F]/10 shadow-sm" : "bg-[#EAE7D6]/80 backdrop-blur-md"
      )}>
        <div className="flex items-center justify-between px-4 md:px-12 py-2 md:py-2.5 max-w-7xl mx-auto relative">
          {/* Logo - Left Section */}
          <div className="flex-1 flex justify-start">
            <Link href="/" className="flex items-center gap-2.5 group cursor-pointer shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[#5D7B6F] flex items-center justify-center shadow-lg shadow-[#5D7B6F]/20 group-hover:rotate-6 transition-transform">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-[#5D7B6F] text-xl tracking-tighter hidden sm:block">FQuiz</span>
            </Link>
          </div>

          {/* Desktop Navigation - Center Section */}
          {user && (
            <div className="hidden md:flex items-center justify-center gap-2 lg:gap-6 flex-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || pathname?.startsWith(link.href + '/')
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex flex-col items-center gap-0.5 px-3 lg:px-4 py-1 rounded-2xl transition-all relative group min-w-[65px]',
                      isActive
                        ? 'text-[#5D7B6F]'
                        : 'text-gray-400 hover:text-[#5D7B6F] hover:bg-[#5D7B6F]/5'
                    )}
                  >
                    <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive && "scale-110 font-black")} />
                    <span className="text-[9px] font-bold uppercase tracking-widest block whitespace-nowrap">
                      {link.name}
                    </span>
                    {isActive && (
                      <div className="absolute -bottom-0.5 w-1 h-1 bg-[#5D7B6F] rounded-full animate-in fade-in zoom-in duration-300" />
                    )}
                  </Link>
                )
              })}
            </div>
          )}

          {/* User Menu - Right Section */}
          <div className="flex-1 flex justify-end">
            {user ? (
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
                    onClick={() => {
                      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/logout`, { method: 'POST' }).then(() => {
                        globalThis.location.href = '/'
                      })
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <Link
                  href="/login"
                  className="text-xs sm:text-base font-black text-[#5D7B6F] hover:text-[#4a6358] px-3 sm:px-6 py-2 sm:py-3 transition-all uppercase tracking-tighter border-2 border-[#5D7B6F] rounded-2xl hover:bg-[#5D7B6F]/5 active:scale-95 whitespace-nowrap"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="text-xs sm:text-base font-black bg-[#5D7B6F] text-white px-3 sm:px-6 py-2 sm:py-3 rounded-2xl hover:bg-[#4a6358] hover:shadow-lg hover:shadow-[#5D7B6F]/30 active:scale-95 transition-all whitespace-nowrap"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      {user && (
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-sm">
          <div className="bg-white/95 backdrop-blur-xl border border-[#5D7B6F]/10 rounded-[28px] shadow-2xl shadow-[#5D7B6F]/20 px-2 py-2 flex items-center justify-around">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname?.startsWith(link.href + '/')
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 transition-all flex-1 min-w-0',
                    isActive ? 'text-[#5D7B6F]' : 'text-gray-400'
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 flex items-center justify-center rounded-xl transition-all",
                    isActive ? "bg-[#5D7B6F] text-white shadow-lg shadow-[#5D7B6F]/20" : "hover:bg-[#5D7B6F]/5"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-tighter truncate w-full text-center px-0.5",
                    isActive ? "text-[#5D7B6F]" : "text-gray-400"
                  )}>
                    {link.name}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
