import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { TextGenre } from '@/lib/modules/learning/models/TextGenre'

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
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
}

export const GET = withAuth(
  async () => {
    try {
      await connectDB()
      const genres = await TextGenre.find({}).sort({ name: 1 }).lean()
      return NextResponse.json({ genres })
    } catch (err) {
      console.error('Error fetching admin genres:', err)
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

      const { name, icon, description, defaultTone, status } = body
      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Tên thể loại văn bản là bắt buộc' }, { status: 400 })
      }

      const code = body.code ? slugify(body.code) : slugify(name.trim())

      const existing = await TextGenre.findOne({ code })
      if (existing) {
        return NextResponse.json({ error: 'Mã thể loại văn bản đã tồn tại' }, { status: 409 })
      }

      const genre = await TextGenre.create({
        name: name.trim(),
        code,
        icon: icon || '📄',
        description: description || '',
        defaultTone: defaultTone || 'formal',
        status: status || 'published',
      })

      return NextResponse.json({ genre }, { status: 201 })
    } catch (err) {
      console.error('Error creating admin genre:', err)
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
  },
  { roles: ['admin'] }
)
