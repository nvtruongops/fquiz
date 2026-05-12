'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'

interface QuizLayoutClientProps {
  initialUser?: { name: string; role: string; avatarUrl?: string } | null
  children: React.ReactNode
}

export default function QuizLayoutClient({ initialUser, children }: QuizLayoutClientProps) {
  const pathname = usePathname()

  // Detect if we are in a quiz session or flashcard session
  const isSession = pathname?.includes('/session/')
  
  // If it's a session page, we want a totally different wrapper
  if (isSession) {
    return (
      <div className="min-h-screen bg-[#F9F9F7]">
        <main className="w-[99%] mx-auto h-screen overflow-hidden">
          {children}
        </main>
      </div>
    )
  }

  // Standard layout for Quiz Detail and other quiz-related pages
  return (
    <div className="min-h-screen flex flex-col bg-[#F9F9F7]">
      <Navbar initialUser={initialUser} />
      <main className="flex-1 w-full pt-4 pb-28 md:pb-8 overflow-x-hidden">
        <div className="w-[92%] md:w-[60%] mx-auto transition-all duration-300">
          {children}
        </div>
      </main>
    </div>
  )
}
