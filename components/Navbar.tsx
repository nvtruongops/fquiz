'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserDropdown } from './navbar/UserDropdown'
import { MobileNav } from './navbar/MobileNav'
import { LayoutDashboard, Library, Compass, Users } from 'lucide-react'

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
  const [user, setUser] = useState<{ name: string; role: string; avatarUrl?: string } | null>(initialUser ?? null)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/me`)
      .then(async (res) => {
        if (res.status === 403) {
          const data = await res.json()
          if (data.banned) {
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
        "sticky top-0 z-50 transition-all duration-500 w-full pt-2.5",
        isScrolled ? "translate-y-[-4px]" : ""
      )}>
        <div className={cn(
          "flex items-center justify-between px-6 md:px-8 py-2 md:py-2.5 w-[92%] md:w-[60%] mx-auto rounded-[24px] transition-all duration-500 shadow-sm",
          isScrolled 
            ? "bg-white/95 backdrop-blur-2xl border border-white/20 shadow-[0_15px_40px_rgba(93,123,111,0.1)]" 
            : "bg-white backdrop-blur-md border border-[#5D7B6F]/10"
        )}>
          {/* Logo - Left Section */}
          <div className="flex-none w-[120px] flex justify-start">
            <Link href="/" className="flex items-center gap-2 group cursor-pointer shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[#5D7B6F] flex items-center justify-center shadow-lg shadow-[#5D7B6F]/20 group-hover:rotate-6 transition-all duration-500">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-[#5D7B6F] text-xl tracking-tighter hidden sm:block">FQuiz</span>
            </Link>
          </div>
 
          {/* Desktop Navigation - Center Section */}
          {user && (
            <div className="hidden md:flex items-center justify-between flex-1 px-4 lg:px-8">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || pathname?.startsWith(link.href + '/')
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all relative group flex-1 text-center',
                      isActive
                        ? 'text-[#5D7B6F] bg-[#5D7B6F]/5'
                        : 'text-gray-400 hover:text-[#5D7B6F] hover:bg-[#5D7B6F]/5'
                    )}
                  >
                    <Icon className={cn("w-5 h-5 transition-all duration-300 group-hover:scale-110", isActive && "scale-110 font-black")} />
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] block whitespace-nowrap">
                      {link.name}
                    </span>
                    {isActive && (
                      <div className="absolute -bottom-0.5 w-1.5 h-1.5 bg-[#5D7B6F] rounded-full animate-in fade-in zoom-in duration-300 shadow-sm shadow-[#5D7B6F]/50" />
                    )}
                  </Link>
                )
              })}
            </div>
          )}
 
          {/* User Menu - Right Section */}
          <div className="flex-none w-[180px] flex justify-end">
            {user ? (
              <UserDropdown user={user} />
            ) : (
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <Link
                  href="/login"
                  className="text-xs sm:text-[11px] font-black text-[#5D7B6F] hover:text-[#4a6358] px-4 sm:px-8 py-2.5 sm:py-3.5 transition-all uppercase tracking-[0.1em] border-2 border-[#5D7B6F] rounded-2xl hover:bg-[#5D7B6F]/5 active:scale-95 whitespace-nowrap"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="text-xs sm:text-[11px] font-black bg-[#5D7B6F] text-white px-4 sm:px-8 py-2.5 sm:py-3.5 rounded-2xl hover:bg-[#4a6358] hover:shadow-[0_10px_25px_rgba(93,123,111,0.3)] active:scale-95 transition-all whitespace-nowrap"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      {user && <MobileNav />}
    </>
  )
}
