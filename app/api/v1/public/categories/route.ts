import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Category } from '@/models/Category'
import { Quiz } from '@/models/Quiz'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()

    // Optimization: Join categories with quizzes but filter for categories that have at least one published quiz
    const pipeline: any[] = [
      {
        $lookup: {
          from: 'quizzes',
          localField: '_id',
          foreignField: 'category_id',
          as: 'quizzes',
        },
      },
      {
        $addFields: {
          publishedQuizCount: {
            $size: {
              $filter: {
                input: '$quizzes',
                as: 'q',
                cond: { 
                  $and: [
                    { $eq: ['$$q.status', 'published'] },
                    { $eq: ['$$q.is_public', true] },
                    { $ne: ['$$q.is_saved_from_explore', true] }
                  ]
                },
              },
            },
          },
        },
      },
      {
        $match: {
          publishedQuizCount: { $gt: 0 },
        },
      },
      {
        $project: {
          id: '$_id',
          _id: 0,
          name: 1,
          publishedQuizCount: 1,
        },
      },
      {
        $sort: { name: 1 },
      },
    ]

    const categoriesList = await Category.aggregate(pipeline)

    return NextResponse.json({
      data: categoriesList,
    })
  } catch (err) {
    console.error('Public Categories Error:', err)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
