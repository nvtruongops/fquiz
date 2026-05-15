'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { cn } from '@/lib/core/utils/utils'

interface AppLayoutProps {
  children: React.ReactNode
  user?: { name: string; role: string; avatarUrl?: string } | null
  showNavbar?: boolean
  className?: string
}

/**
 * AppLayout (Unified)
 * Merges BaseLayout and QuizLayoutClient into a single, high-performance container.
 * Handles automatic session detection and 90% width scaling.
 */
export default function AppLayout({
  children,
  user,
  showNavbar = true,
  className
}: AppLayoutProps) {
  const pathname = usePathname()
  
  // Detect special pages (Sessions, Flashcards, Full-screen modes)
  const isSessionMode = pathname?.includes('/session/') || pathname?.includes('/flashcard/')
  
  // 1. Session Mode: Full-screen, No Navbar, Restricted Scrolling
  if (isSessionMode) {
    return (
      <div className={cn("min-h-screen bg-[#F9F9F7] overflow-hidden", className)}>
        <main className="w-full h-screen">
          {children}
        </main>
      </div>
    )
  }

  // 2. Standard Mode: 90% Width, Tactile Navbar, Standard Padding
  return (
    <div className={cn("min-h-screen flex flex-col bg-[#F9F9F7]", className)}>
      {showNavbar && (
        <Navbar 
          initialUser={user ? { 
            name: user.name, 
            role: user.role, 
            avatarUrl: user.avatarUrl 
          } : null} 
        />
      )}
      
      <main className="flex-1 w-full pt-4 pb-28 md:pb-12 overflow-x-hidden">
        {/* The content container: Now unified to w-full as RootLayout handles the 90% frame */}
        <div className="w-full mx-auto px-4 md:px-8 lg:px-12 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  )
}
