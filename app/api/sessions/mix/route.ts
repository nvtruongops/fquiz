import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import crypto from 'crypto'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import { QuizSession } from '@/models/QuizSession'
import { MongoIdSchema } from '@/lib/schemas'
import { providerFactory } from '@/lib/rate-limit/provider'
import {
  MIX_QUIZ_MAX_SELECT,
  MIX_QUIZ_MAX_QUESTIONS,
  MIX_QUIZ_RATE_LIMIT_MAX,
  MIX_QUIZ_RATE_LIMIT_WINDOW,
} from '@/lib/constants/mix-quiz'
import { z } from 'zod'
import type { IQuestion } from '@/types/quiz'

const CreateMixSessionSchema = z.object({
  quiz_ids: z.array(MongoIdSchema).min(2, 'Cần ít nhất 2 quiz').max(MIX_QUIZ_MAX_SELECT, `Tối đa ${MIX_QUIZ_MAX_SELECT} quiz`),
  question_count: z
    .union([z.number(), z.string()])
    .transform((v) => Number(v))
    .pipe(z.number().int().min(1).max(MIX_QUIZ_MAX_QUESTIONS)),
  // Chỉ 2 chế độ: luyện tập (immediate) hoặc kiểm tra (review)
  mode: z.enum(['immediate', 'review']).default('immediate'),
  // Thứ tự câu hỏi: sequential (theo thứ tự) hoặc random (ngẫu nhiên)
  difficulty: z.enum(['sequential', 'random']).default('random'),
})

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    /* eslint-disable security/detect-object-injection */
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    /* eslint-enable security/detect-object-injection */
  }
  return shuffled
}

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
export async function POST(req: Request) {
  try {
    // 1. Auth
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (payload.role !== 'student') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // 2. Parse body
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

    // 5. Cleanup — delete any existing COMPLETED temp quizzes and sessions for this student
    // This ensures "Only 1 mix quiz" design is enforced even for completed ones.
    const oldTempSessions = await QuizSession.find({
      student_id: studentId,
      is_temp: true,
    }).select('quiz_id').lean()
    
    const oldQuizIds = oldTempSessions.map(s => s.quiz_id).filter(Boolean)
    
    if (oldTempSessions.length > 0) {
      await Promise.all([
        QuizSession.deleteMany({ _id: { $in: oldTempSessions.map(s => s._id) } }),
        Quiz.deleteMany({ _id: { $in: oldQuizIds }, is_temp: true })
      ])
    }

    // 6. Load quizzes — only public + published
    const quizObjectIds = quiz_ids.map((id) => new mongoose.Types.ObjectId(id))
    const quizzes = await Quiz.find({
      _id: { $in: quizObjectIds },
      is_public: true,
      status: 'published',
      is_temp: { $ne: true },
    })
      .select('title course_code questions category_id')
      .lean() as any[]

    const validQuizzes = quizzes.filter((q) => q.questions && q.questions.length > 0)

    if (validQuizzes.length < 2) {
      return NextResponse.json(
        { error: 'Cần ít nhất 2 quiz hợp lệ (công khai, đã xuất bản và có câu hỏi)' },
        { status: 400 }
      )
    }

    // 6. Deduplicate questions across all selected quizzes before sampling.
    // Priority key: question_id (content-based) if present, else _id string.
    const seenKeys = new Set<string>()

    function dedupKey(q: IQuestion): string {
      return q.question_id ?? q._id.toString()
    }

    const uniquePoolsPerQuiz: IQuestion[][] = validQuizzes.map((quiz) => {
      const pool: IQuestion[] = []
      for (const q of quiz.questions as IQuestion[]) {
        const key = dedupKey(q)
        if (!seenKeys.has(key)) {
          seenKeys.add(key)
          pool.push(q)
        }
      }
      return pool
    })

    const deduplicatedQuizzes = uniquePoolsPerQuiz.filter((pool) => pool.length > 0)

    if (deduplicatedQuizzes.length < 2) {
      return NextResponse.json(
        { error: 'Sau khi loại câu hỏi trùng, cần ít nhất 2 quiz có câu hỏi riêng biệt' },
        { status: 400 }
      )
    }

    // 7. Sample proportionally from each deduplicated pool (always random order)
    const numQuizzes = deduplicatedQuizzes.length
    const baseQuota = Math.floor(question_count / numQuizzes)
    const remainder = question_count % numQuizzes

    const sorted = [...deduplicatedQuizzes].sort((a, b) => b.length - a.length)
    const quotas = sorted.map((pool, i) => ({
      pool,
      quota: baseQuota + (i < remainder ? 1 : 0),
    }))

    let surplus = 0
    const firstPass = quotas.map(({ pool, quota }) => {
      const available = pool.length
      if (available >= quota) return { questions: pool, quota }
      surplus += quota - available
      return { questions: pool, quota: available }
    })

    const sampled: IQuestion[] = []
    for (const pass of firstPass) {
      const shuffledPool = shuffleArray(pass.questions)
      let take = pass.quota
      if (surplus > 0) {
        const extra = Math.min(surplus, shuffledPool.length - take)
        if (extra > 0) { take += extra; surplus -= extra }
      }
      sampled.push(...shuffledPool.slice(0, take))
    }

    const finalSampled = shuffleArray(sampled)
    const actualCount = finalSampled.length

    // 8. Create temp quiz — no expires_at (persists until user completes/deletes)
    const quizTitles = validQuizzes.map((q) => q.course_code as string)
    const titlePreview = quizTitles.join(' + ')

    let tempQuiz: any = null
    let retries = 0
    while (retries < 2) {
      try {
        const courseCode = await generateTempCourseCode()
        tempQuiz = await Quiz.create({
          title: `Quiz Trộn · ${titlePreview}`,
          course_code: courseCode,
          category_id: validQuizzes[0].category_id,
          questions: finalSampled,
          questionCount: actualCount,
          is_public: false,
          is_temp: true,
          created_by: studentId,
          status: 'published',
          mix_config: {
            quiz_ids: quizObjectIds,
            question_count: question_count,
            mode: mode,
            category_id: validQuizzes[0].category_id,
          },
          // No expires_at — temp quiz lives until session is completed/deleted
        })
        break
      } catch (err: any) {
        if (err?.code === 11000 && retries < 1) { retries++; continue }
        throw err
      }
    }

    if (!tempQuiz) {
      return NextResponse.json({ error: 'Failed to create temporary quiz' }, { status: 500 })
    }

    // 9. Create quiz session — question order based on difficulty, no expires_at
    const questionOrder = difficulty === 'random'
      ? shuffleArray(Array.from({ length: actualCount }, (_, i) => i))
      : Array.from({ length: actualCount }, (_, i) => i)

    const tempSession = await QuizSession.create({
      student_id: studentId,
      quiz_id: tempQuiz._id,
      mode,
      difficulty,
      status: 'active',
      current_question_index: 0,
      question_order: questionOrder,
      questions_cache: finalSampled,
      score: 0,
      is_temp: true,
      // No expires_at — session persists until completed or manually deleted
      started_at: now,
      last_activity_at: now,
    })

    return NextResponse.json(
      {
        quizId: tempQuiz._id,
        sessionId: tempSession._id,
        actual_count: actualCount,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('POST /api/sessions/mix error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
