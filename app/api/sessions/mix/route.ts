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
  MIX_QUIZ_TTL_HOURS,
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
  mode: z.enum(['immediate', 'review']).default('immediate'),
  difficulty: z.enum(['sequential', 'random']).default('random'),
})

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Generate a unique temp course_code with retry on duplicate key error.
 */
async function generateTempCourseCode(): Promise<string> {
  return `TEMP_${crypto.randomBytes(4).toString('hex').toUpperCase()}`
}

// Mix quiz rate limiter: 5 per hour per user
const mixRateLimiter = providerFactory.createProvider(
  MIX_QUIZ_RATE_LIMIT_MAX,
  MIX_QUIZ_RATE_LIMIT_WINDOW * 1000 // convert seconds to ms
)

/**
 * POST /api/sessions/mix
 * Create a temporary mix quiz session from multiple public quizzes.
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
    const existingSession = await QuizSession.findOne({
      student_id: studentId,
      is_temp: true,
      status: 'active',
      expires_at: { $gt: now },
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
            expires_at: existingSession.expires_at,
          },
        },
        { status: 409 }
      )
    }

    // 5. Load quizzes — only public + published
    const quizObjectIds = quiz_ids.map((id) => new mongoose.Types.ObjectId(id))
    const quizzes = await Quiz.find({
      _id: { $in: quizObjectIds },
      is_public: true,
      status: 'published',
      is_temp: { $ne: true },
    })
      .select('title course_code questions category_id')
      .lean() as any[]

    // Filter valid quizzes (must have questions)
    const validQuizzes = quizzes.filter((q) => q.questions && q.questions.length > 0)

    if (validQuizzes.length < 2) {
      return NextResponse.json(
        { error: 'Cần ít nhất 2 quiz hợp lệ (công khai, đã xuất bản và có câu hỏi)' },
        { status: 400 }
      )
    }

    // 6. Sample proportionally from each quiz, then shuffle the result
    // Each quiz contributes floor(question_count / numQuizzes) questions.
    // Remainder slots go to quizzes with the most questions (largest first).
    // If a quiz has fewer questions than its quota, take all and redistribute surplus.
    const numQuizzes = validQuizzes.length
    const baseQuota = Math.floor(question_count / numQuizzes)
    const remainder = question_count % numQuizzes

    // Sort quizzes descending by question count to distribute remainder to largest first
    const sorted = [...validQuizzes].sort((a, b) => b.questions.length - a.questions.length)
    const quotas = sorted.map((q, i) => ({
      quiz: q,
      quota: baseQuota + (i < remainder ? 1 : 0),
    }))

    // First pass: collect what each quiz can provide
    let surplus = 0
    const firstPass = quotas.map(({ quiz, quota }) => {
      const available = (quiz.questions as IQuestion[]).length
      if (available >= quota) {
        return { questions: quiz.questions as IQuestion[], quota }
      }
      // Quiz has fewer questions than quota — take all, accumulate surplus
      surplus += quota - available
      return { questions: quiz.questions as IQuestion[], quota: available }
    })

    // Second pass: distribute surplus to quizzes that still have unused questions
    const sampled: IQuestion[] = []
    for (const pass of firstPass) {
      const shuffledQuiz = shuffleArray(pass.questions)
      let take = pass.quota
      if (surplus > 0) {
        const extra = Math.min(surplus, shuffledQuiz.length - take)
        if (extra > 0) {
          take += extra
          surplus -= extra
        }
      }
      sampled.push(...shuffledQuiz.slice(0, take))
    }

    // Final shuffle so questions from different quizzes are interleaved
    const finalSampled = shuffleArray(sampled)
    const actualCount = finalSampled.length

    // 8. Create temp quiz
    const expiresAt = new Date(Date.now() + MIX_QUIZ_TTL_HOURS * 60 * 60 * 1000)
    const quizTitles = validQuizzes.map((q) => q.course_code as string)
    const titlePreview = quizTitles.slice(0, 3).join(' + ') + (quizTitles.length > 3 ? ` +${quizTitles.length - 3}` : '')

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
          expires_at: expiresAt,
          status: 'published',
        })
        break
      } catch (err: any) {
        if (err?.code === 11000 && retries < 1) {
          // Duplicate course_code — retry once
          retries++
          continue
        }
        throw err
      }
    }

    if (!tempQuiz) {
      return NextResponse.json({ error: 'Failed to create temporary quiz' }, { status: 500 })
    }

    // 9. Create quiz session
    const questionOrder =
      difficulty === 'random'
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
      expires_at: expiresAt,
      started_at: now,
      last_activity_at: now,
    })

    return NextResponse.json(
      {
        quizId: tempQuiz._id,
        sessionId: tempSession._id,
        actual_count: actualCount,
        expires_at: expiresAt,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('POST /api/sessions/mix error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
