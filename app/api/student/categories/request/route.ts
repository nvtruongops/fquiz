import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/modules/auth/auth'
import { Category } from '@/lib/modules/quiz/models/Category'
import { connectDB } from '@/lib/core/db/mongodb'
import { Types } from 'mongoose'
import { CreateCategoryRequestSchema } from '@/lib/modules/quiz/schemas/category'

export async function POST(req: Request) {
  try {
    await connectDB()
    const payload = await verifyToken(req)
    if (!payload || payload.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    
    // Validate request body with schema
    const validation = CreateCategoryRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validation.error.issues 
      }, { status: 400 })
    }

    const { name } = validation.data

    const existing = await Category.findOne({ name })
    if (existing) {
      return NextResponse.json({ error: 'Tên danh mục này đã tồn tại hoặc đang chờ duyệt.' }, { status: 400 })
    }

    const category = await Category.create({
      name,
      owner_id: new Types.ObjectId(payload.userId),
      type: 'public',
      is_public: false, // will be true once approved
      status: 'pending' // needs admin approval
    })

    return NextResponse.json({ category })
  } catch (error: any) {
    return NextResponse.json({ error: 'Không thể gửi yêu cầu lúc này.' }, { status: 500 })
  }
}
