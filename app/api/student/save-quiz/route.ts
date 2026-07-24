import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { Category } from '@/lib/modules/quiz/models/Category'
import { connectDB } from '@/lib/core/db/mongodb'
import { Types } from 'mongoose'
import { SaveQuizSchema } from '@/lib/modules/quiz/schemas/quiz'

export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = SaveQuizSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
    }

    const { quizId } = parsed.data

    await connectDB()

    // 1. Fetch original quiz and its metadata
    const sourceQuiz = await Quiz.findById(quizId).populate('category_id')
    if (!sourceQuiz || (!sourceQuiz.is_public && sourceQuiz.created_by?.toString() !== payload.userId)) {
      return NextResponse.json({ error: 'Quiz not found or not shareable' }, { status: 404 })
    }

    const sourceCategoryName = sourceQuiz.category_id && typeof sourceQuiz.category_id === 'object' && 'name' in sourceQuiz.category_id
      ? String((sourceQuiz.category_id as { name?: string }).name || 'Khác')
      : 'Khác'

    // Toggle save/unsave: if already saved, delete shortcut to unsave
    const existingShortcut = await Quiz.findOne({
      created_by: new Types.ObjectId(payload.userId),
      original_quiz_id: sourceQuiz._id,
      is_saved_from_explore: true,
    })

    if (existingShortcut) {
      await Quiz.deleteOne({ _id: existingShortcut._id })
      return NextResponse.json({
        unsaved: true,
        quizId: sourceQuiz._id.toString(),
        courseCode: sourceQuiz.course_code,
        message: `Đã xóa mã quiz ${sourceQuiz.course_code} khỏi Bộ đề của tôi`,
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
      saved: true,
      quiz: newQuiz, 
      courseCode: sourceQuiz.course_code,
      message: `Đã lưu mã quiz ${sourceQuiz.course_code}` 
    })

  } catch (error: any) {
    console.error('Error saving quiz shortcut:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })