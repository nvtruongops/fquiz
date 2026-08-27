import { Suspense } from 'react'
import type { Metadata } from 'next'
import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'
import { CommunityClient } from '@/components/community/CommunityClient'
import { CommunitySkeleton } from '@/components/community/CommunitySkeleton'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Diễn đàn Cộng đồng | FQuiz',
  description: 'Thảo luận kinh nghiệm ôn thi, hỏi đáp bài tập và chia sẻ tài liệu học tập cùng cộng đồng FQuiz.',
}

export default async function CommunityPage() {
  const user = await verifySession()

  return (
    <AppLayout user={user ? { _id: user.userId, name: user.username, role: user.role, avatarUrl: user.avatarUrl } : null}>
      <Suspense fallback={<CommunitySkeleton />}>
        <CommunityClient />
      </Suspense>
    </AppLayout>
  )
}
