import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db/mongodb'
import { Quiz } from '@/lib/models/Quiz'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/quizzes/check-code?code=HCM202_SU25_B5_FE&excludeId=xxx
 * Kiểm tra mã đề (course_code hoặc title) đã tồn tại trên hệ thống chưa.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const code = (searchParams.get('code') ?? '').trim()
    const excludeId = (searchParams.get('excludeId') ?? '').trim()

    if (!code) {
      return NextResponse.json(
        { exists: false },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      )
    }

    await connectDB()

    const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const query: any = {
      $or: [
        { course_code: { $regex: `^${escaped}$`, $options: 'i' } },
        { title: { $regex: `^${escaped}$`, $options: 'i' } },
      ],
      is_temp: { $ne: true },
      status: { $ne: 'deleted' },
    }

    if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeId) }
    }

    const existing = (await Quiz.findOne(query)
      .select('title course_code questionCount questions status is_public created_at')
      .lean()) as any

    if (!existing) {
      return NextResponse.json(
        { exists: false },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      )
    }

    const count =
      existing.questionCount || (Array.isArray(existing.questions) ? existing.questions.length : 0)

    return NextResponse.json(
      {
        exists: true,
        quiz: {
          _id: String(existing._id),
          title: existing.title || existing.course_code,
          course_code: existing.course_code || existing.title,
          questionCount: count,
          status: existing.status,
        },
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error: any) {
    console.error('Error checking course_code:', error)
    return NextResponse.json(
      { exists: false, error: 'Failed to check code' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  }
}
