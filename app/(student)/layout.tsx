import React from 'react'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { verifySession } from '@/lib/dal'

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await verifySession()
  
  // Redirect to login if not authenticated
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#EAE7D6]/30">
      <Navbar initialUser={{ name: user.username, role: user.role, avatarUrl: user.avatarUrl }} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-8 pb-28 md:pb-8">
        {children}
      </main>
    </div>
  )
}
