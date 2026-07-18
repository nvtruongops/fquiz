import React from 'react'
import { verifySession } from '@/lib/modules/auth/dal'
import { Suspense } from 'react'
import AppLayout from '@/components/layout/AppLayout'

export const dynamic = 'force-dynamic'

export default async function QuizLayout({ children }: { children: React.ReactNode }) {
  const user = await verifySession()
  
  return (
    <AppLayout 
      user={user ? { _id: user.userId, name: user.username, role: user.role, avatarUrl: user.avatarUrl } : null}
      fixedHeight={true}
    >
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[#5D7B6F] border-t-transparent" /></div>}>
        {children}
      </Suspense>
    </AppLayout>
  )
}
