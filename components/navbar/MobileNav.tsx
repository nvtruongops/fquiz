'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Library, Compass, Users } from 'lucide-react'

const navLinks = [
  { name: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Bộ đề của tôi', href: '/my-quizzes', icon: Library },
  { name: 'Khám phá', href: '/explore', icon: Compass },
  { name: 'Cộng đồng', href: '/community', icon: Users },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
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
                'flex flex-col items-center justify-center gap-1 transition-all flex-1 min-0',
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
  )
}
