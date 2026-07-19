import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { Topic } from '@/lib/modules/learning/models/Topic'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()

    const rawTopics = await Topic.find({ status: 'published' }).sort({ path: 1 }).lean()

    const topics = rawTopics.map((t) => ({
      id: String(t._id),
      name: t.name,
      slug: t.slug,
      path: t.path,
      parentTopicId: t.parentTopicId ? String(t.parentTopicId) : null,
    }))

    return NextResponse.json({
      success: true,
      topics,
    })
  } catch (error: any) {
    console.error('Error fetching topics:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể nạp danh sách chủ đề từ cơ sở dữ liệu' },
      { status: 500 }
    )
  }
}
