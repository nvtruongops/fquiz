'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Menu } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import { UserDropdown } from '@/components/layout/UserDropdown'
import { MobileNav } from '@/components/layout/MobileNav'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/auth/useAuth'
import { useSidebar } from '@/components/layout/Sidebar'

interface NavbarProps {
  initialUser?: { _id?: string; name: string; role: string; avatarUrl?: string } | null
}

export default function Navbar({ initialUser }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { toggle: toggleSidebar } = useSidebar()

  const { data: authData } = useAuth(initialUser ? { user: initialUser } : undefined)
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

            {/* Left: Hamburger + Logo */}
            <div className="flex-none flex items-center gap-3 z-10">
              {user && (
                <button onClick={toggleSidebar}
                  className="hidden md:flex items-center justify-center w-9 h-9 rounded-xl hover:bg-white/60 transition-colors text-slate-400 hover:text-slate-600">
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <Link href="/" prefetch={false} className="flex items-center gap-3 group/logo cursor-pointer shrink-0">
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#5D7B6F] to-[#455A52] flex items-center justify-center shadow-lg shadow-[#5D7B6F]/30 group-hover/logo:scale-105 group-active/logo:scale-95 transition-all duration-300">
                  <div className="absolute inset-0 border border-white/20 rounded-xl" />
                  <BookOpen className="w-5 h-5 text-white drop-shadow-sm" />
                </div>
                <span className="font-black text-slate-800 text-2xl tracking-tighter hidden sm:block bg-clip-text text-transparent bg-gradient-to-br from-slate-800 to-slate-500">
                  FQuiz
                </span>
              </Link>
            </div>
  
            {/* User Area */}
            <div className="flex-none flex justify-end items-center gap-4 z-10">
              {user ? (
                <UserDropdown user={user} />
              ) : (
                <>
                  <Link href="/login" prefetch={false} className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors px-2 py-2">
                    Đăng nhập
                  </Link>
                  <Link href="/register" prefetch={false} className="relative group/btn">
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
