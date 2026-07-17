'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { Sidebar } from '@/components/layout/Sidebar'
import { cn } from '@/lib/core/utils/cn'

interface AppLayoutProps {
  children: React.ReactNode
  user?: { _id?: string; name: string; role: string; avatarUrl?: string } | null
  showNavbar?: boolean
  className?: string
}

export default function AppLayout({ children, user, showNavbar = true, className }: AppLayoutProps) {
  const pathname = usePathname()
  const isSessionMode = pathname?.includes('/session/') || pathname?.includes('/flashcard/')

  if (isSessionMode) {
    return (
      <div className={cn('min-h-screen bg-[#F9F9F7] overflow-hidden', className)}>
        <main className="w-full h-screen">{children}</main>
      </div>
    )
  }

  return (
    <div className={cn('min-h-screen flex bg-[#F9F9F7]', className)}>
      {/* Sidebar – desktop only, positioned relative to viewport */}
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-[80px] transition-all duration-300">
        {showNavbar && (
          <Navbar
            initialUser={user ? { _id: user._id, name: user.name, role: user.role, avatarUrl: user.avatarUrl } : null}
          />
        )}
        <main className="flex-1 w-full pt-4 pb-28 md:pb-12 overflow-x-hidden">
          <div className="w-full mx-auto px-4 md:px-8 lg:px-12 animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
