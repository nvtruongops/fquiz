import type { Metadata } from 'next'
import { verifySession } from '@/lib/modules/auth/dal'
import { LandingHomeClient } from '@/components/home/LandingHomeClient'
import { getLocalizedMetadata } from '@/lib/core/utils/metadata'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata('home')
}

export default async function HomePage() {
  const user = await verifySession()

  return (
    <LandingHomeClient
      user={user ? { name: user.username, role: user.role, avatarUrl: user.avatarUrl } : null}
    />
  )
}
