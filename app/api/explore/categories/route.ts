import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Category } from '@/models/Category'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    await connectDB()
    const categories = await Category.find({ 
      status: 'approved',
      type: 'public'
    }).sort({ name: 1 })

    return NextResponse.json({ categories })
  } catch (err) {
    console.error('Error fetching categories:', err)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
