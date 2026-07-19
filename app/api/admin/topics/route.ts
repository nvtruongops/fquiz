import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Topic } from '@/lib/modules/learning/models/Topic'

export const dynamic = 'force-dynamic'

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export const GET = withAuth(
  async (req: Request) => {
    try {
      await connectDB()
      const topics = await Topic.find({}).sort({ path: 1 }).lean()
      return NextResponse.json({ topics })
    } catch (err) {
      console.error('Error fetching admin topics:', err)
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
  },
  { roles: ['admin'] }
)

export const POST = withAuth(
  async (req: Request) => {
    try {
      await connectDB()
      let body: any
      try {
        body = await req.json()
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
      }

      const { name, parentTopicId, status, tags } = body
      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Tên chủ đề là bắt buộc' }, { status: 400 })
      }

      const nameTrimmed = name.trim()
      const slug = body.slug ? slugify(body.slug) : slugify(nameTrimmed)

      let path = slug
      if (parentTopicId) {
        const parent = await Topic.findById(parentTopicId).lean()
        if (parent) {
          path = `${parent.path}/${slug}`
        }
      }

      const existing = await Topic.findOne({ slug })
      if (existing) {
        return NextResponse.json({ error: 'Slug chủ đề đã tồn tại' }, { status: 409 })
      }

      const parsedTags = Array.isArray(tags)
        ? tags.map((t: any) => String(t).trim()).filter(Boolean)
        : typeof tags === 'string'
        ? tags.split(',').map((t) => t.trim()).filter(Boolean)
        : []

      const topic = await Topic.create({
        name: nameTrimmed,
        slug,
        parentTopicId: parentTopicId || null,
        path,
        tags: parsedTags,
        status: status || 'published',
      })

      return NextResponse.json({ topic }, { status: 201 })
    } catch (err) {
      console.error('Error creating admin topic:', err)
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
  },
  { roles: ['admin'] }
)
