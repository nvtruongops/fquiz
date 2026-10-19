import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async (req: Request, { payload }) => {
  // Avatar upload is no longer supported
  return NextResponse.json({ 
    error: 'Avatar upload has been disabled. Profile pictures are no longer supported.' 
  }, { status: 410 })
}, { roles: ['student'] })