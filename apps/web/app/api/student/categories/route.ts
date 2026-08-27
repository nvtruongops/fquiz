import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Category } from '@/lib/modules/quiz/models/Category'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { connectDB } from '@/lib/core/db/mongodb'
import { Types } from 'mongoose'

export const GET = withAuth(async (req: Request, { payload }) => {
  try {
    await connectDB()
    const userId = new Types.ObjectId(payload.userId)

    // Find category IDs used by any of the student's saved quizzes
    const quizCategoryIds = await Quiz.distinct('category_id', { 
      created_by: userId,
      is_saved_from_explore: true,
    })

    if (quizCategoryIds.length === 0) {
      return NextResponse.json({ categories: [] })
    }

    const categories = await Category.aggregate([
      {
        $match: {
          _id: { $in: quizCategoryIds },
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
                    { $eq: ['$is_saved_from_explore', true] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
              },
            },
          ],
          as: 'quizzesInCategory',
        },
      },
      {
        $addFields: {
          totalQuizCount: { $size: '$quizzesInCategory' },
        },
      },
      {
        $project: {
          quizzesInCategory: 0,
        },
      },
      {
        $sort: { name: 1 },
      },
    ])

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching student categories:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })