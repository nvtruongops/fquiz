'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'

interface QuizLayoutClientProps {
  initialUser?: { name: string; role: string; avatarUrl?: string } | null
  children: React.ReactNode
}

export default function QuizLayoutClient({ initialUser, children }: QuizLayoutClientProps) {
  const pathname = usePathname()

  // Hide Navbar on mobile quiz session pages to avoid overlapping controls
  const isMobileSession = pathname?.includes('/session/') && pathname?.endsWith('/mobile')

  if (isMobileSession) {
    return <>{children}</>
  }

  return (
    <>
      <Navbar initialUser={initialUser} />
      {children}
    </>
  )
}
