import React from 'react'
import { verifySession } from '@/lib/modules/auth/dal'
import { Suspense } from 'react'
import QuizLayoutClient from '@/components/quiz/QuizLayoutClient'

export const dynamic = 'force-dynamic'

export default async function QuizLayout({ children }: { children: React.ReactNode }) {
  const user = await verifySession()
  
  return (
    <QuizLayoutClient 
      initialUser={user ? { name: user.username, role: user.role, avatarUrl: user.avatarUrl } : null}
    >
      <Suspense fallback={null}>
        {children}
      </Suspense>
    </QuizLayoutClient>
  )
}
