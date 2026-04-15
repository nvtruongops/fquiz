import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken, requireRole } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import { QuizSession } from '@/models/QuizSession'
import { Category } from '@/models/Category'
import { CreateQuizSchema, SaveDraftQuizSchema } from '@/lib/schemas'
import { uploadImage, deleteImage, deleteFolder, getPublicIdFromUrl } from '@/lib/cloudinary'
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
      ? SaveDraftQuizSchema.safeParse(body)
      : CreateQuizSchema.safeParse(body)
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

    const oldImageUrls = (existingQuiz.questions as any[])
      .map((q: any) => q.image_url)
      .filter((url: string | undefined): url is string => !!url && url.includes('res.cloudinary.com'))

    // Process new questions and upload new images
    const processedQuestions = await Promise.all(
      questions.map(async (q, index) => {
        let finalImageUrl = q.image_url

        // If it's a new base64 image
        if (q.image_url?.startsWith('data:image')) {
          try {
            finalImageUrl = await uploadImage(q.image_url, {
              folder: `fquiz/quizzes/${id}/questions`,
              public_id: `q_${index}_${Date.now()}`
            })
          } catch (uploadErr) {
            console.error(`Failed to upload image for question ${index}:`, uploadErr)
            finalImageUrl = undefined
          }
        }

        return {
          ...q,
          image_url: finalImageUrl,
        }
      })
    )

    // Identify orphaned images (existed before but not in the new version)
    const newImageUrls = processedQuestions.map((q: any) => q.image_url)
    const orphanedUrls = oldImageUrls.filter((url: string) => !newImageUrls.includes(url))

    // Cleanup orphaned images from Cloudinary in the background
    orphanedUrls.forEach((url: string) => {
      const publicId = getPublicIdFromUrl(url)
      if (publicId) deleteImage(publicId).catch(console.error)
    })

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
    
    // 1. Delete from DB first
    const quiz = await Quiz.findByIdAndDelete(id)
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

    // 2. Delete the associated folder in Cloudinary
    // fquiz/quizzes/{id}
    deleteFolder(`fquiz/quizzes/${id}`).catch(err => {
      console.error(`Failed to delete Cloudinary folder for quiz ${id}:`, err)
    })

    return NextResponse.json({ message: 'Deleted' })
  } catch (err) {
    console.error('Quiz deletion error:', err)
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
