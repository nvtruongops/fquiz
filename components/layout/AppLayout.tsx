'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar, SidebarProvider, useSidebar } from '@/components/layout/Sidebar'
import { TopHeaderBar } from '@/components/layout/TopHeaderBar'
import { cn } from '@/lib/core/utils/cn'

interface AppLayoutProps {
  children: React.ReactNode
  user?: { _id?: string; name: string; role: string; avatarUrl?: string } | null
  showNavbar?: boolean
  className?: string
  fixedHeight?: boolean
}

function AppLayoutContent({ children, user, showNavbar = true, className, fixedHeight = false }: AppLayoutProps) {
  const pathname = usePathname()
  const { collapsed } = useSidebar()

  const isSessionMode = pathname?.includes('/session/') || pathname?.includes('/flashcard/')
  const isFixedHeight = fixedHeight || pathname === '/ai' || pathname === '/dashboard' || pathname === '/admin/categories'
  const hasSidebar = showNavbar && !!user

  if (isSessionMode) {
    return (
      <div className={cn('min-h-screen bg-[#F9F9F7] overflow-hidden', className)}>
        <main className="w-full h-screen">{children}</main>
      </div>
    )
  }

  // Left padding for desktop based on collapsed status
  const desktopLeftPadding = hasSidebar
    ? (collapsed ? 'lg:pl-[80px]' : 'lg:pl-[256px]')
    : ''

  if (isFixedHeight) {
    return (
      <div className={cn('h-dvh max-h-dvh overflow-hidden flex flex-col bg-[#F9F9F7]', className)}>
        <div className="flex-1 w-full min-h-0 flex overflow-hidden">
          {hasSidebar && <Sidebar user={user} />}

          <main
            className={cn(
              'flex-1 w-full min-h-0 overflow-hidden flex flex-col transition-all duration-300',
              hasSidebar ? `${desktopLeftPadding} pt-14 lg:pt-0` : 'pt-0'
            )}
          >
            {showNavbar && <TopHeaderBar user={user} />}
            <div className="w-full flex-1 min-h-0 px-2 sm:px-5 py-2 animate-in fade-in duration-500 overflow-hidden">
              {children}
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('min-h-screen flex flex-col bg-[#F9F9F7]', className)}>
      <div className="flex-1 w-full flex">
        {hasSidebar && <Sidebar user={user} />}

        <main
          className={cn(
            'flex-1 w-full pb-16 transition-all duration-300 overflow-x-hidden',
            hasSidebar ? `${desktopLeftPadding} pt-14 lg:pt-0` : 'pt-0'
          )}
        >
          {showNavbar && <TopHeaderBar user={user} />}
          <div className="w-full px-3 sm:px-8 py-4 animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AppLayout(props: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppLayoutContent {...props} />
    </SidebarProvider>
  )
}
