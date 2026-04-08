'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Library, 
  PlusCircle, 
  Compass, 
  History, 
  Settings,
  User
} from 'lucide-react'

const tabs = [
  { name: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Cá nhân', href: '/profile', icon: User },
  { name: 'Bộ đề của tôi', href: '/my-quizzes', icon: Library },
  { name: 'Tạo bộ đề', href: '/create', icon: PlusCircle },
  { name: 'Khám phá', href: '/explore', icon: Compass },
  { name: 'Lịch sử', href: '/history', icon: History },
  { name: 'Cài đặt', href: '/settings', icon: Settings },
]

export default function StudentTabs() {
  const pathname = usePathname()

  return (
    <div className="w-full bg-white/50 backdrop-blur-md border-b border-[#5D7B6F]/10 sticky top-[72px] z-40">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center overflow-x-auto no-scrollbar gap-1 md:gap-4 py-1">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || pathname?.startsWith(tab.href + '/')
            const Icon = tab.icon
            
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 relative whitespace-nowrap rounded-lg group",
                  isActive 
                    ? "text-[#5D7B6F] bg-[#5D7B6F]/5" 
                    : "text-gray-500 hover:text-[#5D7B6F] hover:bg-gray-50"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-[#5D7B6F]" : "text-gray-400 group-hover:text-[#5D7B6F]")} />
                {tab.name}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5D7B6F] rounded-full scale-x-75 transition-transform" />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
