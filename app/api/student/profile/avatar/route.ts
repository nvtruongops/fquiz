import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

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
