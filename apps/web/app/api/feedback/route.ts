import { NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Feedback } from '@/lib/modules/auth/models/Feedback'
import { User } from '@/lib/modules/auth/models/User'
import { BodyTooLargeError, readBoundedBody } from '@/lib/core/api-helpers'
import { consumeFeedbackQuota } from '@/lib/core/security/rate-limit/feedback-quota'

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
export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    let bytes: Uint8Array
    try {
      bytes = await readBoundedBody(req, 5000)
    } catch (error) {
      if (error instanceof BodyTooLargeError) {
        return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
      }
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    let body: unknown
    try { body = JSON.parse(new TextDecoder().decode(bytes)) } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = CreateFeedbackSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
    }

    await connectDB()

    // Atomically consume the shared rolling-hour quota before creating the record.
    if (!await consumeFeedbackQuota(payload.userId)) {
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
