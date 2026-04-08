import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import logger from '@/lib/logger'

export async function GET(req: Request) {
  const payload = await verifyToken(req)
  if (!payload || payload.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()
    const courses: string[] = await Quiz.distinct('course_code')
    courses.sort()
    return NextResponse.json({ courses })
  } catch (err) {
    logger.error({ err }, 'GET /api/courses failed')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
