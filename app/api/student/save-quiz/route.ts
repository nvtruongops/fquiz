import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import { Category } from '@/models/Category'
import { connectDB } from '@/lib/mongodb'
import { Types } from 'mongoose'

export async function POST(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (payload?.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { quizId } = await req.json()
    if (!quizId) {
      return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 })
    }

    await connectDB()

    // 1. Fetch original quiz and its metadata
    const sourceQuiz = await Quiz.findById(quizId).populate('category_id')
    if (!sourceQuiz || (!sourceQuiz.is_public && sourceQuiz.created_by?.toString() !== payload.userId)) {
      return NextResponse.json({ error: 'Quiz not found or not shareable' }, { status: 404 })
    }

    const sourceCategoryName = sourceQuiz.category_id && typeof sourceQuiz.category_id === 'object' && 'name' in sourceQuiz.category_id
      ? String((sourceQuiz.category_id as { name?: string }).name || 'Khác')
      : 'Khác'

    // Prevent duplicate shortcut creation for the same source quiz and student
    const existingShortcut = await Quiz.findOne({
      created_by: new Types.ObjectId(payload.userId),
      original_quiz_id: sourceQuiz._id,
      is_saved_from_explore: true,
    }).lean()

    if (existingShortcut) {
      return NextResponse.json({
        quiz: existingShortcut,
        message: 'Mã đề này đã được lưu trước đó.',
      }, { status: 200 })
    }

    // 2. Find or Create Destination Category
    let targetCategory = await Category.findOne({
      owner_id: new Types.ObjectId(payload.userId),
      name: sourceCategoryName,
      type: 'private'
    })

    if (!targetCategory) {
      const privateCatCount = await Category.countDocuments({
        owner_id: new Types.ObjectId(payload.userId),
        type: 'private'
      })

      if (privateCatCount < 5) {
        targetCategory = await Category.create({
          name: sourceCategoryName,
          owner_id: new Types.ObjectId(payload.userId),
          type: 'private',
          is_public: false,
          status: 'approved'
        })
      } else {
        targetCategory = await Category.findOne({
          owner_id: new Types.ObjectId(payload.userId),
          type: 'private'
        }).sort({ created_at: 1 })
      }
    }

    if (!targetCategory) {
      return NextResponse.json({ error: 'Bạn cần tạo ít nhất một danh mục cá nhân.' }, { status: 400 })
    }

    // 3. Check 10-quizzes limit
    const quizCount = await Quiz.countDocuments({
      category_id: targetCategory._id,
      created_by: new Types.ObjectId(payload.userId)
    })

    if (quizCount >= 10) {
      return NextResponse.json({ 
        error: `Danh mục "${targetCategory.name}" đã đầy. Hãy xóa bớt trước khi lưu.` 
      }, { status: 400 })
    }

    // 4. Create Shortcut (ID Reference) - DON'T clone questions
    const newQuiz = await Quiz.create({
      title: sourceQuiz.title,
      course_code: sourceQuiz.course_code,
      questionCount: sourceQuiz.questionCount || (Array.isArray(sourceQuiz.questions) ? sourceQuiz.questions.length : 0),
      questions: [], // Shortcut is empty
      category_id: targetCategory._id,
      created_by: new Types.ObjectId(payload.userId),
      original_quiz_id: sourceQuiz._id,
      is_saved_from_explore: true,
      status: 'published',
      is_public: false,
      studentCount: sourceQuiz.studentCount
    })

    return NextResponse.json({ 
      quiz: newQuiz, 
      message: `Đã lưu lối tắt vào danh mục: ${targetCategory.name}` 
    })
  } catch (error: any) {
    console.error('Error saving quiz shortcut:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
