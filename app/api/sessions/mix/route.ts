import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import crypto from 'crypto'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifyToken, JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { MongoIdSchema } from '@/lib/core/schemas/common'
import { providerFactory } from '@/lib/core/security/rate-limit/provider'
import {
  MIX_QUIZ_MAX_SELECT,
  MIX_QUIZ_MAX_QUESTIONS,
  MIX_QUIZ_RATE_LIMIT_MAX,
  MIX_QUIZ_RATE_LIMIT_WINDOW,
} from '@/lib/modules/quiz/constants/mix-quiz'
import { z } from 'zod'
import type { IQuestion } from '@/lib/modules/quiz/types/quiz'
import { publishJob } from '@/lib/core/queue/qstash'

const CreateMixSessionSchema = z.object({
  quiz_ids: z.array(MongoIdSchema).min(2, 'Cần ít nhất 2 quiz').max(MIX_QUIZ_MAX_SELECT, `Tối đa ${MIX_QUIZ_MAX_SELECT} quiz`),
  question_count: z
    .union([z.number(), z.string()])
    .transform((v) => Number(v))
    .pipe(z.number().int().min(1).max(MIX_QUIZ_MAX_QUESTIONS)),
  // Chỉ 2 chế độ: luyện tập (immediate) hoặc kiểm tra (review)
  mode: z.enum(['immediate', 'review', 'flashcard']).default('immediate'),
  // Thứ tự câu hỏi: sequential (theo thứ tự) hoặc random (ngẫu nhiên)
  difficulty: z.enum(['sequential', 'random']).default('random'),
})



/**
 * Generate a unique temp course_code.
 */
async function generateTempCourseCode(): Promise<string> {
  return `TEMP_${crypto.randomBytes(4).toString('hex').toUpperCase()}`
}

// Mix quiz rate limiter: 5 per hour per user
const mixRateLimiter = providerFactory.createProvider(
  MIX_QUIZ_RATE_LIMIT_MAX,
  MIX_QUIZ_RATE_LIMIT_WINDOW * 1000
)

/**
 * POST /api/sessions/mix
 * Create a temporary mix quiz session from multiple public quizzes.
 * Session persists until the user completes or manually deletes it (no TTL).
 */
export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    // Parse body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = CreateMixSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { quiz_ids, question_count, mode, difficulty } = parsed.data

    // 3. Rate limit check
    const rateLimitKey = `mix_quiz:${payload.userId}`
    const rateLimitResult = await mixRateLimiter.check(rateLimitKey)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'rate_limit_exceeded',
          message: 'Bạn đã tạo quá nhiều Quiz Trộn. Vui lòng thử lại sau.',
          reset: rateLimitResult.reset,
          limit: rateLimitResult.limit,
        },
        { status: 429 }
      )
    }

    try {
      await connectDB()
    } catch {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const now = new Date()
    const studentId = new mongoose.Types.ObjectId(payload.userId)

    // 4. Concurrent check — only 1 active temp session allowed
    // Session is active if status='active' and is_temp=true (no TTL check needed)
    const existingSession = await QuizSession.findOne({
      student_id: studentId,
      is_temp: true,
      status: 'active',
    })
      .sort({ started_at: -1 })
      .lean() as any

    if (existingSession) {
      return NextResponse.json(
        {
          error: 'active_mix_exists',
          session: {
            sessionId: existingSession._id,
            quizId: existingSession.quiz_id,
          },
        },
        { status: 409 }
      )
    }

    // 5. Quota Check — Max 10 total (created + mix quizzes combined across account)
    const totalCreatedAndMix = await Quiz.countDocuments({
      created_by: studentId,
      is_saved_from_explore: { $ne: true },
    })

    if (totalCreatedAndMix >= 10) {
      return NextResponse.json(
        {
          error: 'Bạn đã đạt giới hạn tối đa 10 bộ đề (tự tạo + trộn). Vui lòng xóa bớt 1 bài cũ tại Bộ đề của tôi để trộn mới.',
          quotaExceeded: true,
          code: 'TOTAL_QUOTA_EXCEEDED',
        },
        { status: 409 }
      )
    }

    // 6. Create a placeholder session with status 'preparing'
    if (process.env.NODE_ENV !== 'production') console.log('Creating placeholder session...')
    const tempSession = await QuizSession.create({
      student_id: studentId,
      mode,
      difficulty,
      status: 'preparing',
      current_question_index: 0,
      score: 0,
      is_temp: true,
      started_at: now,
      last_activity_at: now,
    })
    if (process.env.NODE_ENV !== 'production') {
      console.log('Placeholder session created:', tempSession._id)
    }

    // 7. Publish job to QStash
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Publishing mix-quiz job... URL: ${appUrl}/api/jobs/mix-quiz`)
    }
    
    // Check if we can do a local bypass for development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Dev] Local environment detected. Using direct handler call bypass...');
      
      // We import it dynamically to avoid any potential circular dependency issues at top level
      // and only in dev mode.
      import('../../jobs/mix-quiz/route').then(m => {
        const mockReq = new Request(`${appUrl}/api/jobs/mix-quiz`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'upstash-signature': 'mock-signature-for-local-dev'
          },
          body: JSON.stringify({
            sessionId: tempSession._id,
            quiz_ids,
            question_count,
            mode,
            difficulty,
            studentId: payload.userId
          })
        });
        
        // Call handler without await to simulate background job
        m.POST(mockReq)
          .then(() => console.log('[Dev] Local job handler bypass completed.'))
          .catch(err => console.error('[Dev] Local job handler bypass failed:', err));
      }).catch(err => console.error('[Dev] Failed to import job handler:', err));
      
      return NextResponse.json(
        {
          sessionId: tempSession._id,
          status: 'preparing',
        },
        { status: 201 }
      )
    }

    const publishResult = await publishJob(`${appUrl}/api/jobs/mix-quiz`, {
      sessionId: tempSession._id,
      quiz_ids,
      question_count,
      mode,
      difficulty,
      studentId: payload.userId
    })

    if (!publishResult.success) {
      console.error('Failed to publish job to QStash:', publishResult.error)
      await QuizSession.deleteOne({ _id: tempSession._id })
      return NextResponse.json({ 
        error: 'Failed to queue background job', 
        message: publishResult.error 
      }, { status: 500 })
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Job published successfully:', publishResult.messageId)
    }

    return NextResponse.json(
      {
        sessionId: tempSession._id,
        status: 'preparing',
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('POST /api/sessions/mix error:', err)
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 })
  }
}, { roles: ['student'] })