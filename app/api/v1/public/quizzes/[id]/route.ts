import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Quiz } from '@/models/Quiz'
import logger from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await connectDB()

    // 1. Fetch Quiz with Populated Category (Subject)
    const quiz = await Quiz.findOne({ 
      _id: id, 
      status: 'published' 
    })
    .select('title course_code questionCount studentCount category_id created_at questions')
    .populate('category_id', 'name')
    .lean()

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found or unpublished' }, { status: 404 })
    }

    const category = quiz.category_id as any

    // 2. Mapping to Decoupled ID
    const responseData = {
      id: quiz._id.toString(),
      title: quiz.title,
      course_code: quiz.course_code,
      questionCount: quiz.questionCount || (quiz.questions?.length ?? 0),
      studentCount: quiz.studentCount || 0,
      categoryId: category._id.toString(),
      categoryName: category.name || 'Môn học chung',
      createdAt: quiz.created_at,
    }

    return NextResponse.json({
      data: responseData,
    })
  } catch (err) {
    logger.error({ err }, `Public Quiz Detail API Error for id: ${id}`)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
