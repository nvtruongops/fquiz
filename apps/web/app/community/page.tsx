import { Suspense } from 'react'
import type { Metadata } from 'next'
import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'
import { CommunityClient } from '@/components/community/CommunityClient'
import { CommunitySkeleton } from '@/components/community/CommunitySkeleton'
import { getLocalizedMetadata } from '@/lib/core/utils/metadata'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata('community')
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
