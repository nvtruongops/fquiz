'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import { UserDropdown } from '@/components/layout/UserDropdown'
import { MobileNav } from '@/components/layout/MobileNav'
import { LayoutDashboard, Library, Compass, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/auth/useAuth'

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
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  const { data: authData } = useAuth(initialUser ? { user: initialUser } : undefined)
  
  // Never let a stale cached guest response override server-confirmed session data.
  const user = authData?.user ?? initialUser

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!mounted) {
    return (
      <nav className="sticky top-0 z-50 w-full pt-4 px-6 md:px-0">
        <div className="h-[64px] w-full md:w-[65%] mx-auto rounded-[24px] bg-white/50 border border-white/20 shadow-sm" />
      </nav>
    )
  }

  return (
    <>
      <nav className={cn(
        "sticky top-0 z-50 transition-all duration-300 w-full pt-3 px-2 md:px-6",
        isScrolled ? "translate-y-[-1px]" : ""
      )}>
        <div className="relative w-full mx-auto group">
          {/* Pro 3D Depth Layer - Subtler and sharper */}
          <div className="absolute inset-0 bg-slate-900/5 rounded-[20px] translate-y-[2px] transition-all duration-300 group-hover:translate-y-[3px]" />
          
          {/* Main Glass Top Layer */}
          <div className={cn(
            "relative flex items-center justify-between px-6 md:px-8 py-2.5 rounded-[20px] transition-all duration-300 border border-white/50",
            isScrolled 
              ? "bg-white/95 backdrop-blur-xl shadow-[0_8px_20px_rgba(0,0,0,0.04)]" 
              : "bg-white/90 backdrop-blur-md shadow-sm"
          )}>
            {/* Logo area */}
            <div className="flex-none w-[120px] flex justify-start">
              <Link href="/" className="flex items-center gap-3 group cursor-pointer shrink-0">
                <div className="relative w-9 h-9 rounded-xl bg-[#5D7B6F] flex items-center justify-center shadow-md shadow-[#5D7B6F]/20 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-slate-800 text-xl tracking-tighter hidden sm:block">FQuiz</span>
              </Link>
            </div>
  
            {/* Navigation Links - Sleeker Pro Look */}
            {user && (
              <div className="hidden md:flex items-center justify-center flex-1 px-4 gap-2">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href || pathname?.startsWith(link.href + '/')
                  const Icon = link.icon
                  return (
                    <motion.div key={link.href} whileTap={{ y: 2 }} className="relative flex-1 max-w-[120px]">
                      <Link
                        href={link.href}
                        className={cn(
                          'relative flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl transition-all group',
                          isActive
                            ? 'text-[#5D7B6F] bg-[#5D7B6F]/5'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        )}
                      >
                        <Icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isActive && "scale-110")} />
                        <span className="text-[10px] font-black uppercase tracking-widest block text-center">
                          {link.name}
                        </span>
                        {isActive && (
                          <motion.div layoutId="nav-active" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#5D7B6F] rounded-full" />
                        )}
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            )}
  
            {/* User Area - Clean & Sharp */}
            <div className="flex-none w-[200px] flex justify-end items-center gap-4">
              {user ? (
                <UserDropdown user={user} />
              ) : (
                <>
                  <Link href="/login" className="text-[12px] font-bold text-slate-600 hover:text-slate-900 transition-colors">
                    Đăng nhập
                  </Link>
                  <Link href="/register" className="relative group">
                    <div className="absolute inset-0 bg-[#5D7B6F]/10 rounded-xl translate-y-1 transition-transform group-hover:translate-y-1.5" />
                    <div className="relative text-[11px] font-black bg-[#5D7B6F] text-white px-5 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-[#5D7B6F]/15 uppercase tracking-wider">
                      Bắt đầu
                    </div>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {user && <MobileNav />}
    </>
  )
}
