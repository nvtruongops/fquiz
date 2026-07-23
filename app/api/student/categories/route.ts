import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Category } from '@/lib/modules/quiz/models/Category'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { connectDB } from '@/lib/core/db/mongodb'
import { Types } from 'mongoose'
import { CreateCategorySchema } from '@/lib/modules/quiz/schemas/category'
import { validateObjectId } from '@/lib/core/schemas/common'
import { validationErrorResponse, parseJsonBody } from '@/lib/core/api-helpers'

export const GET = withAuth(async (req: Request, { payload }) => {
  try {
    await connectDB()
    const userId = new Types.ObjectId(payload.userId)

    // Find category IDs used by any of the student's quizzes
    const studentQuizzes = await Quiz.find({ created_by: userId })
      .select('category_id')
      .lean() as any[]
    const quizCategoryIds = Array.from(
      new Set(studentQuizzes.map((q) => q.category_id?.toString()).filter(Boolean))
    ).map((id) => new Types.ObjectId(id))

    // Match private categories owned by user OR public/course categories of user's quizzes
    const categories = await Category.aggregate([
      {
        $match: {
          $or: [
            { owner_id: userId },
            { _id: { $in: quizCategoryIds } },
          ],
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

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })

export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    await connectDB()
    const body = await parseJsonBody(req)
    if (body instanceof NextResponse) return body

    // Validate with schema
    const parsed = CreateCategorySchema.safeParse(body)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error)
    }

    const { name } = parsed.data

    const isTeacherOrAdmin = ['teacher', 'admin', 'dev'].includes(payload.role)
    if (!isTeacherOrAdmin) {
      const count = await Category.countDocuments({
        owner_id: new Types.ObjectId(payload.userId),
        type: 'private'
      })
      if (count >= 5) {
        return NextResponse.json({ error: 'Bạn chỉ có thể tạo tối đa 5 danh mục cá nhân.' }, { status: 400 })
      }
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
}, { roles: ['student'] })

export const PATCH = withAuth(async (req: Request, { payload }) => {
  try {
    await connectDB()
    const body = await parseJsonBody(req)
    if (body instanceof NextResponse) return body

    const { id, name } = body as { id?: string; name?: string }

    if (!id || !name) {
      return NextResponse.json({ error: 'ID and Name are required' }, { status: 400 })
    }

    // Validate ObjectId
    if (!validateObjectId(id)) {
      return NextResponse.json({ error: 'Invalid category ID format' }, { status: 400 })
    }

    // Validate name
    const nameValidation = CreateCategorySchema.shape.name.safeParse(name)
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
}, { roles: ['student'] })

export const DELETE = withAuth(async (req: Request, { payload }) => {
  try {
    await connectDB()
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

    return NextResponse.json({ message: 'Danh mục đã xóa successfully' })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })