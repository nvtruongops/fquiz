'use client'

import Navbar from '@/components/layout/Navbar'

interface NavbarWrapperProps {
  initialUser?: { name: string; role: string; avatarUrl?: string } | null
  children: React.ReactNode
}

// Thin client wrapper to pass initialUser from server layout to client Navbar
export default function NavbarWrapper({ initialUser, children }: NavbarWrapperProps) {
  return (
    <>
      <Navbar initialUser={initialUser} />
      {children}
    </>
  )
}
