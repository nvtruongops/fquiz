import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { CreateHighlightSchema } from '@/lib/schemas'
import { UserHighlight } from '@/models/UserHighlight'

export async function GET(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const question_id = searchParams.get('question_id')
    if (!question_id) {
      return NextResponse.json({ error: 'question_id is required' }, { status: 400 })
    }

    await connectDB()

    const highlights = await UserHighlight.find({
      student_id: payload.userId,
      question_id,
    }).lean()

    return NextResponse.json({ highlights }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}

export async function POST(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = CreateHighlightSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
    }

    const { question_id, text_segment, color_code, offset } = parsed.data
    const student_id = payload.userId

    await connectDB()

    const count = await UserHighlight.countDocuments({ student_id, question_id })
    if (count >= 10) {
      return NextResponse.json(
        { error: 'Highlight limit reached (max 10 per question)' },
        { status: 400 }
      )
    }

    const highlight = new UserHighlight({
      student_id,
      question_id,
      text_segment,
      color_code,
      offset,
    })
    const saved = await highlight.save()

    return NextResponse.json({ highlight: saved }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
