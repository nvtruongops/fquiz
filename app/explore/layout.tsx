import React from 'react'
import { verifySession } from '@/lib/modules/auth/dal'
import BaseLayout from '@/components/layout/BaseLayout'

export const dynamic = 'force-dynamic'

export default async function ExploreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await verifySession()
  
  return (
    <BaseLayout user={user}>
      {children}
    </BaseLayout>
  )
}
