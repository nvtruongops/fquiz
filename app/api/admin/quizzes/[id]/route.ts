import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken, requireRole } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import { QuizSession } from '@/models/QuizSession'
import { Category } from '@/models/Category'
import { CreateQuizSchema, SaveDraftQuizSchema, AdminCreateQuizSchema, AdminSaveDraftQuizSchema } from '@/lib/schemas'
import { analyzeQuizCompleteness } from '@/lib/quiz-analyzer'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requireRole(payload, 'admin')

    await connectDB()
    const quiz = await Quiz.findById(id).lean()
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

    // Admin gets full quiz including correct_answer
    return NextResponse.json({ quiz })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userPayload = await verifyToken(req)
    if (!userPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requireRole(userPayload, 'admin')

    await connectDB()
    const body = await req.json()
    const { lastUpdatedAt } = body // Client sends the last known updatedAt

    const isDraft = body.status === 'draft'
    const parsed = isDraft
      ? AdminSaveDraftQuizSchema.safeParse(body)
      : AdminCreateQuizSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { category_id, course_code, questions, status, description } = parsed.data

    const category = await Category.findOne({
      _id: category_id,
      type: 'public',
      status: 'approved',
    })
      .select('_id')
      .lean()

    if (!category) {
      return NextResponse.json(
        { error: 'Danh mục không hợp lệ cho admin (chỉ cho phép môn học public đã duyệt).' },
        { status: 400 }
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

    // 2. Optimistic Locking Check
    const existingQuiz = await Quiz.findById(id)
    if (!existingQuiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

    if (lastUpdatedAt && new Date(existingQuiz.updatedAt).getTime() !== new Date(lastUpdatedAt).getTime()) {
      return NextResponse.json({ 
        error: 'Dữ liệu đã bị thay đổi bởi người khác. Vui lòng làm mới trang.',
        code: 'CONCURRENCY_ERROR' 
      }, { status: 409 })
    }

    const oldImageUrls: string[] = [] // No longer tracking Cloudinary images

    // Process new questions (base64 images are no longer supported)
    const processedQuestions = questions.map((q) => {
      // Only accept direct image URLs, not base64
      const finalImageUrl = q.image_url?.startsWith('data:image') ? '' : q.image_url

      return {
        ...q,
        image_url: finalImageUrl || '',
      }
    })

    // No cleanup needed since we're not using Cloudinary anymore

    // 3. Atomic Update with Lock
    const quiz = await Quiz.findOneAndUpdate(
      { _id: id, updatedAt: existingQuiz.updatedAt },
      {
        $set: {
          title: course_code.trim().toUpperCase(),
          description,
          category_id,
          course_code,
          questions: processedQuestions,
          questionCount: processedQuestions.length,
          status,
          is_public: status === 'published',
        },
      },
      { new: true }
    )

    if (!quiz) {
       return NextResponse.json({ error: 'Xung đột dữ liệu. Vui lòng thử lại.' }, { status: 409 })
    }

    // Count affected completed sessions for FE warning
    const affectedSessionCount = await QuizSession.countDocuments({
      quiz_id: id,
      status: 'completed',
    })

    return NextResponse.json({ quiz, affectedSessionCount })
  } catch (err) {
    console.error('Quiz update error:', err)
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userPayload = await verifyToken(req)
    if (!userPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requireRole(userPayload, 'admin')

    const body = await req.json()
    const { status, lastUpdatedAt } = body
    if (!status || !['published', 'draft'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    await connectDB()

    // 1. Strict Validation for Publishing
    if (status === 'published') {
      const existing = await Quiz.findById(id)
      if (!existing) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
      
      const diagnostics = analyzeQuizCompleteness(existing)
      if (!diagnostics.isValid) {
        return NextResponse.json({ 
          error: 'Không thể công khai quiz chưa hoàn thiện', 
          diagnostics 
        }, { status: 400 })
      }
    }

    // 2. Atomic Update with Lock
    const query: any = { _id: id }
    if (lastUpdatedAt) query.updatedAt = new Date(lastUpdatedAt)

    const quiz = await Quiz.findOneAndUpdate(
      query,
      { status, is_public: status === 'published' },
      { new: true }
    )
    if (!quiz) return NextResponse.json({ error: 'Xung đột dữ liệu hoặc Quiz không tồn tại' }, { status: 409 })

    return NextResponse.json({ quiz })
  } catch (err) {
    console.error('Quiz patch error:', err)
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userPayload = await verifyToken(req)
    if (!userPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requireRole(userPayload, 'admin')

    await connectDB()
    
    // 1. Delete from DB
    const quiz = await Quiz.findByIdAndDelete(id)
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

    // No Cloudinary cleanup needed anymore

    return NextResponse.json({ message: 'Deleted' })
  } catch (err) {
    console.error('Quiz deletion error:', err)
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
