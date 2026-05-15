import React from 'react'
import { verifySession } from '@/lib/modules/auth/dal'
import { Suspense } from 'react'
import AppLayout from '@/components/layout/AppLayout'

export const dynamic = 'force-dynamic'

export default async function QuizLayout({ children }: { children: React.ReactNode }) {
  const user = await verifySession()
  
  return (
    <AppLayout 
      user={user ? { name: user.username, role: user.role, avatarUrl: user.avatarUrl } : null}
    >
      <Suspense fallback={null}>
        {children}
      </Suspense>
    </AppLayout>
  )
}
