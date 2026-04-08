import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { Category } from '@/models/Category'
import { Quiz } from '@/models/Quiz'
import { connectDB } from '@/lib/mongodb'
import { Types } from 'mongoose'
import { CreateCategoryRequestSchema, validateObjectId } from '@/lib/schemas'

export async function GET(req: Request) {
  try {
    await connectDB()
    const payload = await verifyToken(req)
    if (payload?.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = new Types.ObjectId(payload.userId)

    // 1. Danh mục cá nhân + thống kê số quiz tự tạo vs quiz lưu Explore
    const privateCategories = await Category.aggregate([
      {
        $match: {
          owner_id: userId,
          type: 'private',
        },
      },
      {
        $lookup: {
          from: 'quizzes',
          let: { categoryId: '$_id', userId },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$category_id', '$$categoryId'] },
                    { $eq: ['$created_by', '$$userId'] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                is_saved_from_explore: 1,
              },
            },
          ],
          as: 'quizzesInCategory',
        },
      },
      {
        $addFields: {
          savedQuizCount: {
            $size: {
              $filter: {
                input: '$quizzesInCategory',
                as: 'q',
                cond: { $eq: ['$$q.is_saved_from_explore', true] },
              },
            },
          },
          ownQuizCount: {
            $size: {
              $filter: {
                input: '$quizzesInCategory',
                as: 'q',
                cond: { $ne: ['$$q.is_saved_from_explore', true] },
              },
            },
          },
          totalQuizCount: { $size: '$quizzesInCategory' },
        },
      },
      {
        $project: {
          quizzesInCategory: 0,
        },
      },
      {
        $sort: { created_at: -1 },
      },
    ])

    return NextResponse.json({ categories: privateCategories })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await connectDB()
    const payload = await verifyToken(req)
    if (payload?.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Validate with schema
    const parsed = CreateCategoryRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { name } = parsed.data

    // Check limit of 5
    const count = await Category.countDocuments({ 
      owner_id: new Types.ObjectId(payload.userId),
      type: 'private'
    })

    if (count >= 5) {
      return NextResponse.json({ error: 'Bạn chỉ có thể tạo tối đa 5 danh mục cá nhân.' }, { status: 400 })
    }

    const category = await Category.create({
      name,
      owner_id: new Types.ObjectId(payload.userId),
      type: 'private',
      is_public: false,
      status: 'approved'
    })

    return NextResponse.json({ category })
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Tên danh mục đã tồn tại.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    await connectDB()
    const payload = await verifyToken(req)
    if (payload?.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { id, name } = body as { id?: string; name?: string }
    
    if (!id || !name) {
      return NextResponse.json({ error: 'ID and Name are required' }, { status: 400 })
    }

    // Validate ObjectId
    if (!validateObjectId(id)) {
      return NextResponse.json({ error: 'Invalid category ID format' }, { status: 400 })
    }

    // Validate name
    const nameValidation = CreateCategoryRequestSchema.shape.name.safeParse(name)
    if (!nameValidation.success) {
      return NextResponse.json(
        { error: 'Invalid name', details: nameValidation.error.issues },
        { status: 400 }
      )
    }

    const category = await Category.findOneAndUpdate(
      { _id: new Types.ObjectId(id), owner_id: new Types.ObjectId(payload.userId) },
      { name: nameValidation.data },
      { new: true }
    )

    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    await connectDB()
    const payload = await verifyToken(req)
    if (payload?.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Validate ObjectId
    if (!validateObjectId(id)) {
      return NextResponse.json({ error: 'Invalid category ID format' }, { status: 400 })
    }

    // Check if category has quizzes
    const quizCount = await Quiz.countDocuments({ category_id: new Types.ObjectId(id) })
    if (quizCount > 0) {
      return NextResponse.json({ 
        error: `Không thể xóa: Danh mục này đang chứa ${quizCount} mã đề. Hãy di chuyển hoặc xóa các mã đề trước.` 
      }, { status: 400 })
    }

    const category = await Category.findOneAndDelete({ 
      _id: new Types.ObjectId(id), 
      owner_id: new Types.ObjectId(payload.userId) 
    })

    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
