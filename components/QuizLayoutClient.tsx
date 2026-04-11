'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'

interface QuizLayoutClientProps {
  initialUser?: { name: string; role: string; avatarUrl?: string } | null
  children: React.ReactNode
}

export default function QuizLayoutClient({ initialUser, children }: QuizLayoutClientProps) {
  const pathname = usePathname()

  // Hide Navbar on all quiz session pages (desktop + mobile) to maximize space
  const isSession = pathname?.includes('/session/')

  if (isSession) {
    return <>{children}</>
  }

  return (
    <>
      <Navbar initialUser={initialUser} />
      {children}
    </>
  )
}
