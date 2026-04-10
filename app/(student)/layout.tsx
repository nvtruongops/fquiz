import React from 'react'
import Navbar from '@/components/Navbar'
import { getServerUser } from '@/lib/get-server-user'

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const initialUser = await getServerUser()

  return (
    <div className="min-h-screen flex flex-col bg-[#EAE7D6]/30">
      <Navbar initialUser={initialUser} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-8 pb-28 md:pb-8">
        {children}
      </main>
    </div>
  )
}
