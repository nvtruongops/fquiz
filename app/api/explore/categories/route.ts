import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { Category, PUBLIC_CATEGORY_MATCH } from '@/lib/modules/quiz/models/Category'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    await connectDB()
    const categories = await Category.find(PUBLIC_CATEGORY_MATCH).sort({ name: 1 })

    return NextResponse.json({ categories })
  } catch (err) {
    console.error('Error fetching categories:', err)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
