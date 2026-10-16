import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { Category } from '@/lib/modules/quiz/models/Category'
import { PinnedQuestion } from '@/lib/modules/quiz/models/PinnedQuestion'
import { Types } from 'mongoose'
import { generateQuestionId } from '@/lib/modules/quiz/question-id-generator'
import { parseJsonBody } from '@/lib/core/api-helpers'
import { ensureCategoryForCourseCode } from '@/lib/modules/quiz/utils/category-helper'

/**
 * POST /api/student/quizzes/from-pinned
 * Body: { course_code: string, title?: string }
 * Creates a custom quiz from student's pinned questions of course_code.
 * Enforces max 10 custom quizzes quota limit.
 */
export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    await connectDB()
    const body = await parseJsonBody(req)
    if (body instanceof NextResponse) return body

    const { course_code, title } = body as any
    if (!course_code || typeof course_code !== 'string') {
      return NextResponse.json({ error: 'Course code is required.' }, { status: 400 })
    }

    const normalizedCourseCode = course_code.trim().toUpperCase()
    const userObjectId = new Types.ObjectId(payload.userId)

    // 1. Quota Check — Max 10 custom/created/mix quizzes combined
    const totalCreatedAndMix = await Quiz.countDocuments({
      created_by: userObjectId,
      is_saved_from_explore: { $ne: true },
    })

    if (totalCreatedAndMix >= 10) {
      return NextResponse.json(
        {
          error: 'You have reached the maximum limit of 10 quizzes (custom + mix). Please delete an existing quiz before creating a new one.',
          quotaExceeded: true,
          code: 'TOTAL_QUOTA_EXCEEDED',
        },
        { status: 409 }
      )
    }

    // 2. Resolve Category (Auto-create category if missing)
    const targetCategory = await ensureCategoryForCourseCode(normalizedCourseCode, userObjectId)
    const escapedCode = course_code.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // eslint-disable-next-line security/detect-non-literal-regexp
    const codeRegex = new RegExp(`^${escapedCode}(_.*)?$`, 'i')

    let categoryQuizIds: Types.ObjectId[] = []
    let categoryCourseCodes: string[] = []

    if (targetCategory?._id) {
      const quizzes = await Quiz.find({ category_id: targetCategory._id })
        .select('_id course_code')
        .lean() as any[]
      categoryQuizIds = quizzes.map((q) => q._id)
      categoryCourseCodes = quizzes.map((q) => q.course_code?.trim().toUpperCase()).filter(Boolean)
    }

    // 3. Fetch pinned questions matching prefix or category
    const pinnedFilter: any = {
      student_id: userObjectId,
      $or: [
        { course_code: { $regex: codeRegex } },
        ...(categoryQuizIds.length > 0 ? [{ quiz_id: { $in: categoryQuizIds } }] : []),
        ...(categoryCourseCodes.length > 0 ? [{ course_code: { $in: categoryCourseCodes } }] : []),
      ],
    }

    const pinnedDocs = await PinnedQuestion.find(pinnedFilter).sort({ created_at: -1 }).lean()

    if (!pinnedDocs || pinnedDocs.length === 0) {
      return NextResponse.json(
        { error: `No pinned questions found for course ${normalizedCourseCode}.` },
        { status: 400 }
      )
    }

    // 4. Transform pinned questions to Quiz questions format (Auto-resolving correct answers & sanitizing)
    const { Question } = await import('@/lib/modules/quiz/models/Question')
    const quizQuestions = await Promise.all(pinnedDocs.map(async (pq: any) => {
      let validCorrectAnswer: number[] | undefined = Array.isArray(pq.correct_answer) && pq.correct_answer.length > 0 
        ? pq.correct_answer 
        : undefined

      // If correct_answer was missing or empty, attempt auto-resolve from Quiz or Question DB
      if (!validCorrectAnswer) {
        if (pq.quiz_id && Types.ObjectId.isValid(pq.quiz_id)) {
          const sourceQuiz: any = await Quiz.findById(pq.quiz_id).select('questions').lean()
          if (sourceQuiz?.questions) {
            const matched = sourceQuiz.questions.find((q: any) => 
              (pq.question_id && (q._id?.toString() === pq.question_id || q.question_id === pq.question_id)) ||
              (q.text && q.text.trim() === pq.text?.trim())
            )
            if (matched && matched.correct_answer !== undefined && matched.correct_answer !== null) {
              validCorrectAnswer = Array.isArray(matched.correct_answer) 
                ? matched.correct_answer 
                : typeof matched.correct_answer === 'number' 
                  ? [matched.correct_answer] 
                  : undefined
            }
          }
        }

        if (!validCorrectAnswer && pq.text) {
          const standalone: any = await Question.findOne({ text: pq.text.trim() }).select('correct_answer').lean()
          if (standalone && standalone.correct_answer !== undefined && standalone.correct_answer !== null) {
            validCorrectAnswer = Array.isArray(standalone.correct_answer) 
              ? standalone.correct_answer 
              : typeof standalone.correct_answer === 'number' 
                ? [standalone.correct_answer] 
                : undefined
          }
        }
      }

      // Ensure options has at least 2 valid strings (required by QuestionSchema)
      let rawOptions = Array.isArray(pq.options) ? pq.options.filter((o: any) => typeof o === 'string' && o.trim().length > 0) : []
      if (rawOptions.length < 2) {
        rawOptions = ['True', 'False']
      }

      // Ensure correct_answer indices are valid within [0, rawOptions.length - 1]
      let finalCorrectAnswer = (validCorrectAnswer || [0])
        .map((idx) => (typeof idx === 'number' ? idx : parseInt(String(idx), 10)))
        .filter((idx) => !isNaN(idx) && idx >= 0 && idx < rawOptions.length)
      if (finalCorrectAnswer.length === 0) {
        finalCorrectAnswer = [0]
      }

      return {
        text: pq.text || '',
        options: rawOptions,
        correct_answer: finalCorrectAnswer,
        explanation: pq.explanation || '',
        image_url: pq.image_url || '',
        question_id: pq.question_id || generateQuestionId({ text: pq.text || '', options: rawOptions, correct_answer: finalCorrectAnswer }),
      }
    }))

    // 5. Generate quiz title
    const customTitle = title && typeof title === 'string' && title.trim().length > 0
      ? title.trim()
      : `${normalizedCourseCode} - Pinned Quiz (${quizQuestions.length} QUESTIONS)`

    // 6. Create or update pinned quiz for this course to avoid E11000 duplicate key conflict
    const existingPinnedQuiz = await Quiz.findOne({
      created_by: userObjectId,
      course_code: normalizedCourseCode,
      is_saved_from_explore: { $ne: true },
      is_temp: { $ne: true },
    })

    let quiz: any
    if (existingPinnedQuiz) {
      existingPinnedQuiz.title = customTitle
      existingPinnedQuiz.questions = quizQuestions
      existingPinnedQuiz.questionCount = quizQuestions.length
      existingPinnedQuiz.description = `Custom quiz created from ${quizQuestions.length} pinned questions of course ${normalizedCourseCode}`
      existingPinnedQuiz.category_id = targetCategory._id
      await existingPinnedQuiz.save()
      quiz = existingPinnedQuiz
    } else {
      try {
        quiz = await Quiz.create({
          title: customTitle,
          course_code: normalizedCourseCode,
          description: `Custom quiz created from ${quizQuestions.length} pinned questions of course ${normalizedCourseCode}`,
          category_id: targetCategory._id,
          created_by: userObjectId,
          is_public: false,
          status: 'published',
          questions: quizQuestions,
          questionCount: quizQuestions.length,
        })
      } catch (createErr: any) {
        if (createErr?.code === 11000) {
          // Fallback with suffixed course code if collision with another custom quiz
          const suffixedCode = `${normalizedCourseCode}_PINNED_${Date.now().toString().slice(-4)}`
          quiz = await Quiz.create({
            title: customTitle,
            course_code: suffixedCode,
            description: `Custom quiz created from ${quizQuestions.length} pinned questions of course ${normalizedCourseCode}`,
            category_id: targetCategory._id,
            created_by: userObjectId,
            is_public: false,
            status: 'published',
            questions: quizQuestions,
            questionCount: quizQuestions.length,
          })
        } else {
          throw createErr
        }
      }
    }

    return NextResponse.json({
      quiz,
      message: `Successfully created pinned quiz (${quizQuestions.length} questions)!`,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating quiz from pinned questions:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })
