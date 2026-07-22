import type { Metadata } from 'next'
import React from 'react'
import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/modules/auth/dal'
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Teacher Panel — FQuiz',
  robots: { index: false, follow: false },
}

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await verifySession()

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/login')
  }

  // Check role authorization
  if (!['teacher', 'admin', 'dev'].includes(user.role)) {
    redirect('/dashboard')
  }

  const teacherUser = {
    _id: user.userId,
    name: user.username,
    role: user.role,
    avatarUrl: user.avatarUrl,
  }

  return (
    <div className="min-h-screen bg-[#F9F9F7] flex">
      <TeacherSidebar user={teacherUser} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-300">
          {children}
        </div>
      </main>
    </div>
  )
}
