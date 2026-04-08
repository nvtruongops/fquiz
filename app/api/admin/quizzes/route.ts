import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { verifyToken, requireRole } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import { User } from '@/models/User'
import { CreateQuizSchema, QuizListQuerySchema } from '@/lib/schemas'
import { uploadImage } from '@/lib/cloudinary'
import { QuizSession } from '@/models/QuizSession'
import { analyzeQuizCompleteness } from '@/lib/quiz-analyzer'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requireRole(payload, 'admin')

    const { searchParams } = new URL(req.url)
    
    // Validate query params
    const queryValidation = QuizListQuerySchema.safeParse({
      ...(searchParams.get('page') !== null && { page: searchParams.get('page') }),
      ...(searchParams.get('limit') !== null && { limit: searchParams.get('limit') }),
      ...(searchParams.get('category_id') !== null && { category_id: searchParams.get('category_id') }),
      ...(searchParams.get('search') !== null && { search: searchParams.get('search') }),
    })

    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryValidation.error.issues },
        { status: 400 }
      )
    }

    const { page, limit, category_id: categoryId, search } = queryValidation.data
    const skip = (page - 1) * limit

    await connectDB()

    const adminUsers = await User.find({ role: 'admin' }).select('_id').lean()
    const adminIds = adminUsers.map((u: any) => u._id)

    const query: any = {
      is_saved_from_explore: { $ne: true },
      $and: [
        {
          $or: [
            { created_by: { $in: adminIds } },
            { created_by: null },
            { created_by: { $exists: false } },
          ],
        },
      ],
    }
    if (categoryId) query.category_id = categoryId
    if (search) {
      query.$and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { course_code: { $regex: search, $options: 'i' } },
        ],
      })
    }

    const [quizzesRaw, total] = await Promise.all([
      Quiz.find(query).skip(skip).limit(limit).sort({ created_at: -1 }).lean(),
      Quiz.countDocuments(query),
    ])

    // Enrich with student count
    const quizzes = await Promise.all(
      quizzesRaw.map(async (quiz: any) => {
        const uniqueStudents = await QuizSession.distinct('student_id', {
          quiz_id: quiz._id,
          status: 'completed',
        })
        const studentCount = uniqueStudents.length
        let normalizedQuestionCount = 0
        const declaredQuestionCount = Number(quiz.questionCount ?? 0)
        if (declaredQuestionCount > 0) {
          normalizedQuestionCount = declaredQuestionCount
        } else if (Array.isArray(quiz.questions)) {
          normalizedQuestionCount = quiz.questions.length
        }

        return {
          ...quiz,
          questionCount: normalizedQuestionCount,
          studentCount,
        }
      })
    )

    return NextResponse.json({ quizzes, total, page })
  } catch (err) {
    console.error('Error fetching quizzes:', err)
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}

export async function POST(req: Request) {
  try {
    const userPayload = await verifyToken(req)
    if (!userPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requireRole(userPayload, 'admin')

    await connectDB()
    const body = await req.json()
    const parsed = CreateQuizSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
    }

    const { title, category_id, course_code, questions, status } = parsed.data
    const normalizedCourseCode = course_code.trim().toUpperCase()

    const existingOwnedQuiz = await Quiz.findOne({
      created_by: new mongoose.Types.ObjectId(userPayload.userId),
      is_saved_from_explore: { $ne: true },
      course_code: normalizedCourseCode,
    })
      .select('_id')
      .lean()

    if (existingOwnedQuiz) {
      return NextResponse.json(
        { error: `Mã quiz ${normalizedCourseCode} đã tồn tại trong kho quiz của bạn.` },
        { status: 409 }
      )
    }

    // 1. Strict Validation for Publishing
    if (status === 'published') {
       const diagnostics = analyzeQuizCompleteness(parsed.data)
       if (!diagnostics.isValid) {
         return NextResponse.json({ 
           error: 'Không thể công khai quiz chưa hoàn thiện', 
           diagnostics 
         }, { status: 400 })
       }
    }

    // 1. Generate quiz ID first for folder organization
    const quizId = new mongoose.Types.ObjectId()

    // 2. Process questions and upload images to Cloudinary
    const processedQuestions = await Promise.all(
      questions.map(async (q: any, index) => {
        let finalImageUrl = q.image_url

        // Check if image_url is base64 (starts with "data:image")
        if (q.image_url?.startsWith('data:image')) {
          try {
            // Upload to Cloudinary in a specific folder for this quiz
            // fquiz/quizzes/{quizId}/questions
            finalImageUrl = await uploadImage(q.image_url, {
              folder: `fquiz/quizzes/${quizId}/questions`,
              public_id: `q_${index}_${Date.now()}` // Using index + timestamp to avoid collisions
            })
          } catch (uploadErr) {
            console.error(`Failed to upload image for question ${index}:`, uploadErr)
            // Continue without image or handle error? For now, we continue
            finalImageUrl = undefined
          }
        }

        return {
          ...q,
          image_url: finalImageUrl,
        }
      })
    )

    const quiz = await Quiz.create({
      _id: quizId,
      title,
      category_id,
      course_code: normalizedCourseCode,
      questions: processedQuestions,
      created_by: userPayload.userId,
      status: status || 'published',
      is_public: (status || 'published') === 'published',
    })

    return NextResponse.json({ quiz }, { status: 201 })
  } catch (err) {
    console.error('Quiz creation error:', err)
    if (err instanceof Response) return err
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ error: 'Mã quiz đã tồn tại trong kho quiz của bạn.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
