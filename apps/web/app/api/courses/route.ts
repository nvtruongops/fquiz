import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifyToken } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import logger from '@/lib/core/utils/logger'

export const GET = withAuth(async (req: Request, { payload }) => {
  try {
    await connectDB()
    const courses: string[] = await Quiz.distinct('course_code')
    courses.sort((a, b) => a.localeCompare(b))
    return NextResponse.json({ courses })
  } catch (err) {
    logger.error({ err }, 'GET /api/courses failed')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}, { roles: ['student'] })