import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { TextGenre } from '@/lib/modules/learning/models/TextGenre'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()

    const rawGenres = await TextGenre.find({ status: 'published' }).sort({ name: 1 }).lean()

    const genres = rawGenres.map((g) => ({
      id: String(g._id),
      name: g.name,
      code: g.code,
      description: g.description,
      icon: g.icon,
      defaultTone: g.defaultTone,
    }))

    return NextResponse.json({
      success: true,
      genres,
    })
  } catch (error: any) {
    console.error('Error fetching text genres:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể nạp danh sách thể loại văn bản từ cơ sở dữ liệu' },
      { status: 500 }
    )
  }
}
