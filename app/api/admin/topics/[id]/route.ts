import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Topic } from '@/lib/modules/learning/models/Topic'

export const dynamic = 'force-dynamic'

export const PUT = withAuth(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      await connectDB()

      let body: any
      try {
        body = await req.json()
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
      }

      const { name, slug, parentTopicId, status, tags } = body
      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Tên chủ đề là bắt buộc' }, { status: 400 })
      }

      const parsedTags = tags !== undefined
        ? Array.isArray(tags)
          ? tags.map((t: any) => String(t).trim()).filter(Boolean)
          : typeof tags === 'string'
          ? tags.split(',').map((t) => t.trim()).filter(Boolean)
          : []
        : undefined

      const updated = await Topic.findByIdAndUpdate(
        id,
        {
          $set: {
            name: name.trim(),
            ...(slug && { slug: slug.trim().toLowerCase().replace(/\s+/g, '-') }),
            ...(parentTopicId !== undefined && { parentTopicId: parentTopicId || null }),
            ...(status && { status }),
            ...(parsedTags !== undefined && { tags: parsedTags }),
          },
        },
        { new: true }
      ).lean()

      if (!updated) {
        return NextResponse.json({ error: 'Không tìm thấy chủ đề' }, { status: 404 })
      }

      return NextResponse.json({ topic: updated })
    } catch (err) {
      console.error('Error updating admin topic:', err)
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
  },
  { roles: ['admin'] }
)

export const DELETE = withAuth(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params
      await connectDB()

      const topic = await Topic.findByIdAndDelete(id).lean()
      if (!topic) {
        return NextResponse.json({ error: 'Không tìm thấy chủ đề' }, { status: 404 })
      }

      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('Error deleting admin topic:', err)
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
  },
  { roles: ['admin'] }
)
