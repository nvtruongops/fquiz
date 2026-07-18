'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { cn } from '@/lib/core/utils/cn'

interface AppLayoutProps {
  children: React.ReactNode
  user?: { _id?: string; name: string; role: string; avatarUrl?: string } | null
  showNavbar?: boolean
  className?: string
  fixedHeight?: boolean
}

export default function AppLayout({ children, user, showNavbar = true, className, fixedHeight = false }: AppLayoutProps) {
  const pathname = usePathname()
  const isSessionMode = pathname?.includes('/session/') || pathname?.includes('/flashcard/')

  if (isSessionMode) {
    return (
      <div className={cn('min-h-screen bg-[#F9F9F7] overflow-hidden', className)}>
        <main className="w-full h-screen">{children}</main>
      </div>
    )
  }

  if (fixedHeight) {
    return (
      <div className={cn('h-screen max-h-screen overflow-hidden flex flex-col bg-[#F9F9F7]', className)}>
        {showNavbar && (
          <Navbar
            initialUser={user ? { _id: user._id, name: user.name, role: user.role, avatarUrl: user.avatarUrl } : null}
          />
        )}
        <main className={cn('flex-1 w-full min-h-0 overflow-hidden flex flex-col pb-4', showNavbar ? 'pt-20 sm:pt-24' : 'pt-4')}>
          <div className="w-full h-full flex flex-col min-h-0 px-3 sm:px-6 md:px-8 lg:px-12 animate-in fade-in duration-500 overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={cn('min-h-screen flex flex-col bg-[#F9F9F7]', className)}>
      {/* Top Navbar */}
      {showNavbar && (
        <Navbar
          initialUser={user ? { _id: user._id, name: user.name, role: user.role, avatarUrl: user.avatarUrl } : null}
        />
      )}

      {/* Main Content Area */}
      <main className={cn('flex-1 w-full pb-28 md:pb-12 overflow-x-hidden', showNavbar ? 'pt-24 sm:pt-28' : 'pt-4')}>
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  )
}
