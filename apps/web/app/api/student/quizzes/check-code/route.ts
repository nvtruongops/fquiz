import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { getPublicQuizFilter } from '@/lib/modules/quiz/utils/public-quiz-filter'

export const dynamic = 'force-dynamic'

/**
 * GET /api/student/quizzes/check-code?code=MLN131_DE01&excludeId=xxx
 * Check whether course / quiz code (course_code) already exists in system.
 */
export const GET = withAuth(async (req: Request, { payload }) => {
  try {
    const { searchParams } = new URL(req.url)
    const code = (searchParams.get('code') ?? '').trim()
    const excludeId = (searchParams.get('excludeId') ?? '').trim()

    if (!code) {
      return NextResponse.json({ exists: false })
    }

    await connectDB()

    const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const query: any = {
      course_code: { $regex: `^${escaped}$`, $options: 'i' },
      is_temp: { $ne: true },
      status: { $ne: 'deleted' },
    }

    if (payload.role !== 'admin' && payload.role !== 'dev') {
      query.$or = [
        getPublicQuizFilter(),
        { created_by: mongoose.Types.ObjectId.isValid(payload.userId) ? new mongoose.Types.ObjectId(payload.userId) : payload.userId },
      ]
    }

    if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeId) }
    }

    const existing = await Quiz.findOne(query)
      .select('title course_code questionCount status is_public created_at')
      .lean() as any

    if (!existing) {
      return NextResponse.json({ exists: false })
    }

    return NextResponse.json({
      exists: true,
      quiz: {
        _id: String(existing._id),
        title: existing.title,
        course_code: existing.course_code,
        questionCount: existing.questionCount || 0,
        status: existing.status,
      },
    })
  } catch (error: any) {
    console.error('Error checking course_code:', error)
    return NextResponse.json({ exists: false, error: 'Failed to check code' }, { status: 500 })
  }
}, { roles: ['teacher'] })
