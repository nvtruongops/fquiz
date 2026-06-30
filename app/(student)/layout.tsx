import type { Metadata } from 'next'
import React from 'react'
import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

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
    <AppLayout user={{ name: user.username, role: user.role, avatarUrl: user.avatarUrl }}>
      {children}
    </AppLayout>
  )
}
