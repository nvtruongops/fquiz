import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { User } from '@/lib/modules/auth/models/User'

const MAX_PINS = 20

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const payload = await verifyToken(req)
  if (!payload || !['student', 'dev', 'admin'].includes(payload.role)) {
    return NextResponse.json({ pinnedQuizzes: [] })
  }
  await connectDB()
  const user = (await User.findById(payload.userId).select('pinned_quizzes').lean()) as any
  return NextResponse.json({ pinnedQuizzes: user?.pinned_quizzes ?? [] })
}

export const POST = withAuth(
  async (req: Request, { payload }) => {
    const { quizId } = await req.json().catch(() => ({}))
    if (!quizId) return NextResponse.json({ error: 'quizId required' }, { status: 400 })

    await connectDB()
    const user = (await User.findById(payload.userId).select('pinned_quizzes').lean()) as any
    const current: string[] = user?.pinned_quizzes ?? []

    if (current.includes(quizId)) {
      // Unpin
      await User.updateOne({ _id: payload.userId }, { $pull: { pinned_quizzes: quizId } })
      return NextResponse.json({
        pinned: false,
        pinnedQuizzes: current.filter((id: string) => id !== quizId),
      })
    }

    if (current.length >= MAX_PINS) {
      return NextResponse.json({ error: `Tối đa ${MAX_PINS} bộ đề được ghim` }, { status: 400 })
    }

    // Pin
    await User.updateOne({ _id: payload.userId }, { $addToSet: { pinned_quizzes: quizId } })
    return NextResponse.json({ pinned: true, pinnedQuizzes: [...current, quizId] })
  },
  { roles: ['student', 'dev'] }
)
