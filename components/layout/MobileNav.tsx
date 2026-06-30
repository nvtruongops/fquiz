'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/core/utils/cn'
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
    <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-sm animate-in slide-in-from-bottom-8 duration-500">
      <div className="bg-white/95 backdrop-blur-2xl border border-gray-100 rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.18)] px-2 py-2.5 flex items-center justify-around">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || pathname?.startsWith(link.href + '/')
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-all flex-1 min-w-0 group',
                isActive ? 'text-[#5D7B6F]' : 'text-slate-400'
              )}
            >
              <div className={cn(
                "w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-300",
                isActive 
                  ? "bg-[#5D7B6F] text-white shadow-lg shadow-[#5D7B6F]/20 scale-105" 
                  : "hover:bg-slate-50 active:scale-95"
              )}>
                <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-2")} />
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-tight text-center px-0.5 leading-tight",
                isActive ? "text-[#5D7B6F]" : "text-gray-400"
              )}>
                {link.name.includes(' ') ? (
                  <>
                    {link.name.split(' ')[0]}
                    <br />
                    {link.name.split(' ').slice(1).join(' ')}
                  </>
                ) : (
                  link.name
                )}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
