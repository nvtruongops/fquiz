import { NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { Feedback } from '@/models/Feedback'
import { User } from '@/models/User'

// Whitelist: chỉ giữ ký tự an toàn, loại bỏ mọi tag HTML và control characters
function sanitizeText(v: string): string {
  return v
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars (giữ \n \r \t)
    .trim()
}

const CreateFeedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'content', 'other']),
  message: z
    .string()
    .trim()
    .min(5, 'Góp ý phải có ít nhất 5 ký tự')
    .max(1000, 'Góp ý tối đa 1000 ký tự')
    .transform(sanitizeText)
    .refine((v) => v.length >= 5, 'Góp ý phải có ít nhất 5 ký tự sau khi làm sạch'),
}).strict()

// Rate limit: max 3 feedbacks per user per hour (DB-based)
const RATE_LIMIT = 3
const RATE_WINDOW_MS = 60 * 60 * 1000

export async function POST(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (payload.role !== 'student') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Reject oversized payloads (> 5KB) trước khi parse
    const bodyStr = JSON.stringify(body)
    if (bodyStr.length > 5000) {
      return NextResponse.json({ error: 'Payload quá lớn' }, { status: 413 })
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
        { error: 'Bạn đã gửi quá nhiều góp ý. Vui lòng thử lại sau 1 giờ.' },
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
}
