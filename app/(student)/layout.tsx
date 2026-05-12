import React from 'react'
import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/modules/auth/dal'
import BaseLayout from '@/components/layout/BaseLayout'

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
    <BaseLayout user={user}>
      {children}
    </BaseLayout>
  )
}
