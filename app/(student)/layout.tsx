import React from 'react'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { verifySession } from '@/lib/dal'

export const dynamic = 'force-dynamic'

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
    <div className="min-h-screen flex flex-col bg-[#F9F9F7]">
      <Navbar initialUser={{ name: user.username, role: user.role, avatarUrl: user.avatarUrl }} />
      <main className="flex-1 w-full pt-4 pb-28 md:pb-8 overflow-x-hidden">
        <div className="w-[92%] md:w-[60%] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
