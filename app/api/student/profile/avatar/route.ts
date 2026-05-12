import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/modules/auth/auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { User } from '@/lib/modules/auth/models/User'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const payload = await verifyToken(req)
  if (payload?.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Avatar upload is no longer supported
  return NextResponse.json({ 
    error: 'Avatar upload has been disabled. Profile pictures are no longer supported.' 
  }, { status: 410 })
}
