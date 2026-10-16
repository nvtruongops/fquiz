import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'

export const POST = withAuth<{ id: string }>(async () => {
  return NextResponse.json(
    { error: 'Direct password reset via Admin Panel has been disabled for user security reasons.' },
    { status: 403 }
  )
})
