import { NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifyToken } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Feedback } from '@/lib/modules/auth/models/Feedback'
import { User } from '@/lib/modules/auth/models/User'

// Whitelist: retain safe characters only, remove all HTML tags and control characters
function sanitizeText(v: string): string {
  return v
    .replace(/<[^>]{0,1000}>/g, '')           // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars (keep \n \r \t)
    .trim()
}

const CreateFeedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'content', 'other']),
  message: z
    .string()
    .trim()
    .min(5, 'Feedback must be at least 5 characters')
    .max(1000, 'Feedback must not exceed 1000 characters')
    .transform(sanitizeText)
    .refine((v) => v.length >= 5, 'Feedback must be at least 5 characters after sanitization'),
}).strict()

// Rate limit: max 3 feedbacks per user per hour (DB-based)
const RATE_LIMIT = 3
const RATE_WINDOW_MS = 60 * 60 * 1000

export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    const contentLength = Number(req.headers.get('content-length') || '0')
    if (contentLength > 5000) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = CreateFeedbackSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
    }

    await connectDB()

    // Rate limit check
    const since = new Date(Date.now() - RATE_WINDOW_MS)
    const recentCount = await Feedback.countDocuments({
      user_id: payload.userId,
      created_at: { $gt: since },
    })
    if (recentCount >= RATE_LIMIT) {
      return NextResponse.json(
        { error: 'You have submitted too much feedback. Please try again in 1 hour.' },
        { status: 429 }
      )
    }

    const user = await User.findById(payload.userId).select('username email').lean() as { username: string; email: string } | null
    const safeUsername = sanitizeText(user?.username ?? 'unknown').slice(0, 50)

    await Feedback.create({
      user_id: payload.userId,
      username: safeUsername,
      user_email: user?.email ?? '',
      type: parsed.data.type,
      message: parsed.data.message,
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('POST /api/feedback error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'] })