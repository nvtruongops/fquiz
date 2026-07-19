import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { TextGenre } from '@/lib/modules/learning/models/TextGenre'

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

      const { name, icon, description, defaultTone, status } = body
      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Tên thể loại văn bản là bắt buộc' }, { status: 400 })
      }

      const updated = await TextGenre.findByIdAndUpdate(
        id,
        {
          $set: {
            name: name.trim(),
            ...(icon && { icon }),
            ...(description !== undefined && { description }),
            ...(defaultTone && { defaultTone }),
            ...(status && { status }),
          },
        },
        { new: true }
      ).lean()

      if (!updated) {
        return NextResponse.json({ error: 'Không tìm thấy thể loại văn bản' }, { status: 404 })
      }

      return NextResponse.json({ genre: updated })
    } catch (err) {
      console.error('Error updating admin genre:', err)
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

      const deleted = await TextGenre.findByIdAndDelete(id).lean()
      if (!deleted) {
        return NextResponse.json({ error: 'Không tìm thấy thể loại văn bản' }, { status: 404 })
      }

      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('Error deleting admin genre:', err)
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
  },
  { roles: ['admin'] }
)
