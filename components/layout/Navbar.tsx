'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, LayoutDashboard, Library, Compass, Users } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import { UserDropdown } from '@/components/layout/UserDropdown'
import { MobileNav } from '@/components/layout/MobileNav'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/auth/useAuth'

const navLinks = [
  { name: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Bộ đề của tôi', href: '/my-quizzes', icon: Library },
  { name: 'Khám phá', href: '/', icon: Compass },
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
    // Initial check in case the page is already scrolled on load
    handleScroll()
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
        "sticky top-0 z-50 transition-all duration-500 w-full pt-4 px-4 md:px-6",
        isScrolled ? "translate-y-[-8px]" : ""
      )}>
        <div className="relative w-full max-w-6xl mx-auto group">
          {/* Animated Glow when Scrolled */}
          <div className={cn(
            "absolute -inset-2 bg-gradient-to-r from-[#5D7B6F]/20 to-[#A4C3A2]/20 rounded-[28px] blur-xl transition-opacity duration-700",
            isScrolled ? "opacity-100" : "opacity-0"
          )} />
          
          {/* Main Glass Layer */}
          <div className={cn(
            "relative flex items-center justify-between px-6 py-3 rounded-[24px] transition-all duration-500 border overflow-hidden",
            isScrolled 
              ? "bg-white/70 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-white/60" 
              : "bg-white/40 backdrop-blur-xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border-white/40 hover:bg-white/50"
          )}>
            
            {/* Inner Highlight line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-50" />

            {/* Logo area */}
            <div className="flex-none flex justify-start z-10">
              <Link href="/" className="flex items-center gap-3 group/logo cursor-pointer shrink-0">
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#5D7B6F] to-[#455A52] flex items-center justify-center shadow-lg shadow-[#5D7B6F]/30 group-hover/logo:scale-105 group-active/logo:scale-95 transition-all duration-300">
                  <div className="absolute inset-0 border border-white/20 rounded-xl" />
                  <BookOpen className="w-5 h-5 text-white drop-shadow-sm" />
                </div>
                <span className="font-black text-slate-800 text-2xl tracking-tighter hidden sm:block bg-clip-text text-transparent bg-gradient-to-br from-slate-800 to-slate-500">
                  FQuiz
                </span>
              </Link>
            </div>
  
            {/* Navigation Links - Desktop Only */}
            {user && (
              <div className="hidden md:flex items-center justify-center gap-2 absolute left-1/2 -translate-x-1/2 z-10">
                {navLinks.map((link) => {
                  // Adjust active check for the home page specifically
                  const isActive = link.href === '/' 
                    ? pathname === '/' 
                    : pathname === link.href || pathname?.startsWith(link.href + '/');
                    
                  const Icon = link.icon
                  
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        'relative flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 group/link',
                        isActive
                          ? 'text-[#5D7B6F]'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
                      )}
                    >
                      {isActive && (
                        <motion.div 
                          layoutId="nav-pill"
                          className="absolute inset-0 bg-white shadow-sm border border-slate-100 rounded-full -z-10"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <Icon className={cn("w-4 h-4 transition-transform duration-300 group-hover/link:scale-110", isActive && "scale-110")} />
                      <span className="text-sm font-bold tracking-wide block">
                        {link.name}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
  
            {/* User Area */}
            <div className="flex-none flex justify-end items-center gap-4 z-10">
              {user ? (
                <UserDropdown user={user} />
              ) : (
                <>
                  <Link href="/login" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors px-2 py-2">
                    Đăng nhập
                  </Link>
                  <Link href="/register" className="relative group/btn">
                    <div className="absolute inset-0 bg-[#5D7B6F]/20 rounded-full blur-md group-hover/btn:blur-lg transition-all duration-300 opacity-0 group-hover/btn:opacity-100" />
                    <div className="relative text-sm font-black bg-gradient-to-b from-[#6B8D7F] to-[#5D7B6F] text-white px-6 py-2.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_4px_14px_rgba(93,123,111,0.39)] border border-[#7BA090]/50 tracking-wide">
                      Bắt đầu ngay
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
