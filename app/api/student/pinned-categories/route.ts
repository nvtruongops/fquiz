import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

const MAX_PINS = 5

export async function GET(req: Request) {
  const payload = await verifyToken(req)
  if (payload?.role !== 'student') {
    return NextResponse.json({ pinnedCategories: [] })
  }
  await connectDB()
  const user = await User.findById(payload.userId).select('pinned_categories').lean() as any
  return NextResponse.json({ pinnedCategories: user?.pinned_categories ?? [] })
}

export async function POST(req: Request) {
  const payload = await verifyToken(req)
  if (payload?.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { categoryId } = await req.json().catch(() => ({}))
  if (!categoryId) return NextResponse.json({ error: 'categoryId required' }, { status: 400 })

  await connectDB()
  const user = await User.findById(payload.userId).select('pinned_categories').lean() as any
  const current: string[] = user?.pinned_categories ?? []

  if (current.includes(categoryId)) {
    // Unpin
    await User.updateOne({ _id: payload.userId }, { $pull: { pinned_categories: categoryId } })
    return NextResponse.json({ pinned: false, pinnedCategories: current.filter((id: string) => id !== categoryId) })
  }

  if (current.length >= MAX_PINS) {
    return NextResponse.json({ error: `Tối đa ${MAX_PINS} danh mục được ghim` }, { status: 400 })
  }

  // Pin
  await User.updateOne({ _id: payload.userId }, { $addToSet: { pinned_categories: categoryId } })
  return NextResponse.json({ pinned: true, pinnedCategories: [...current, categoryId] })
}
