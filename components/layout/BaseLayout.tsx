import React from 'react'
import Navbar from '@/components/layout/Navbar'
import { SessionUser } from '@/lib/modules/auth/dal'

interface BaseLayoutProps {
  children: React.ReactNode
  user?: SessionUser | null
  showNavbar?: boolean
  containerWidth?: string // e.g. "w-[92%] md:w-[60%]"
}

export default function BaseLayout({
  children,
  user,
  showNavbar = true,
  containerWidth = "w-full"
}: BaseLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9F9F7]">
      {showNavbar && (
        <Navbar 
          initialUser={user ? { 
            name: user.username, 
            role: user.role, 
            avatarUrl: user.avatarUrl 
          } : null} 
        />
      )}
      <main className="flex-1 w-full pt-4 pb-28 md:pb-8 overflow-x-hidden">
        <div className="w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
