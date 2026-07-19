'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/core/utils/cn'
import { BookOpen, FileText, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

const tabs = [
  { id: 'study', name: 'Study', href: '/my-quizzes', icon: BookOpen },
  { id: 'test', name: 'Test', href: '/my-quizzes', icon: FileText },
  { id: 'analytics', name: 'Analytics', href: '/dashboard', icon: TrendingUp },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm animate-in slide-in-from-bottom-8 duration-700 fade-in-0">
      <div className="absolute -inset-2 bg-gradient-to-r from-[#5D7B6F]/10 via-[#A4C3A2]/10 to-[#5D7B6F]/10 rounded-[2.5rem] blur-xl opacity-60 pointer-events-none" />
      
      <div className="relative bg-white/70 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-2 flex items-center justify-between gap-1 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
        
        {tabs.map((tab) => {
          const isActive =
            tab.id === 'study'
              ? pathname === '/my-quizzes' || pathname?.startsWith('/create') || pathname === '/'
              : tab.id === 'test'
                ? pathname?.startsWith('/history') || pathname?.startsWith('/quiz')
                : pathname === '/dashboard' || pathname?.startsWith('/dashboard')

          const Icon = tab.icon

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 transition-all duration-300 w-16 h-16 min-h-[44px] min-w-[44px] group outline-none',
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="mobile-nav-active"
                  className="absolute inset-0 bg-white rounded-[2rem] shadow-sm border border-slate-100 -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              
              <div className={cn(
                "relative flex items-center justify-center transition-all duration-300",
                isActive ? "text-[#5D7B6F] scale-110 mb-0.5" : "text-slate-400 group-hover:text-slate-600"
              )}>
                {isActive && (
                  <div className="absolute inset-0 bg-[#5D7B6F]/20 blur-md rounded-full -z-10" />
                )}
                <Icon className={cn("w-[22px] h-[22px]", isActive ? "stroke-[2.5px]" : "stroke-2")} />
              </div>

              <span className={cn(
                "text-[10px] font-bold tracking-tight text-center leading-none transition-all duration-300",
                isActive ? "text-slate-800 opacity-100" : "text-slate-400 opacity-70 group-hover:opacity-100"
              )}>
                {tab.name}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
