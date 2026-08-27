import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { withAuth } from '@/lib/auth/with-auth'
import { connectDB } from '@/lib/db/mongodb'
import { Quiz } from '@/lib/models/Quiz'
import { QuestionBank } from '@/lib/models/QuestionBank'
import {
  generateQuestionId,
  getAnswerTexts,
  areAnswersSame,
  normalizeTextAST,
  hasOptionOverlap,
} from '@/lib/utils/question-id'
import { z } from 'zod'

const CheckQuestionsSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'ID danh mục môn không hợp lệ'),
  questions: z.array(
    z.object({
      text: z.string(),
      options: z.array(z.string()),
      correct_answer: z.union([z.number(), z.array(z.number())]),
      explanation: z.string().optional(),
      image_url: z.string().optional(),
    })
  ),
})

export const POST = withAuth(async (req: Request) => {
  try {
    const body = await req.json()
    const parsed = CheckQuestionsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { category_id, questions } = parsed.data
    await connectDB()

    const categoryObjectId = new mongoose.Types.ObjectId(category_id)
    const catQuery = { $in: [categoryObjectId, category_id] }

    // 1. Fetch both QuestionBank entries and Quizzes in this category
    const [bankEntries, quizzes] = await Promise.all([
      QuestionBank.find({ category_id: catQuery }).lean(),
      Quiz.find({ category_id: catQuery, status: { $ne: 'deleted' }, is_temp: { $ne: true } })
        .select('course_code title questions')
        .lean(),
    ])

    interface BankQuestionEntry {
      question_id: string
      text: string
      options: string[]
      correct_answer: number[]
      explanation?: string
      quizzes: Array<{ quiz_id?: string; course_code: string }>
    }

    const bankIdMap = new Map<string, BankQuestionEntry>()
    const bankTextMap = new Map<string, BankQuestionEntry>()

    // Index QuestionBank collection
    for (const qb of bankEntries as any[]) {
      if (!qb.text || !Array.isArray(qb.options) || qb.options.length === 0) continue

      const qId = qb.question_id || generateQuestionId(qb)
      const normalizedAnswer: number[] = Array.isArray(qb.correct_answer)
        ? qb.correct_answer
        : typeof qb.correct_answer === 'number'
        ? [qb.correct_answer]
        : [0]

      const entry: BankQuestionEntry = {
        question_id: qId,
        text: qb.text,
        options: qb.options,
        correct_answer: normalizedAnswer,
        explanation: qb.explanation,
        quizzes: (qb.used_in_quizzes || []).map((code: string) => ({ course_code: code })),
      }

      bankIdMap.set(qId, entry)
      const normText = normalizeTextAST(qb.text)
      if (normText && !bankTextMap.has(normText)) {
        bankTextMap.set(normText, entry)
      }
    }

    // Index Quizzes collection questions as well
    for (const quiz of quizzes as any[]) {
      if (!Array.isArray(quiz.questions)) continue
      for (const q of quiz.questions) {
        if (!q.text || !Array.isArray(q.options) || q.options.length === 0) continue

        const qId = q.question_id || generateQuestionId(q)
        const normalizedAnswer: number[] = Array.isArray(q.correct_answer)
          ? q.correct_answer
          : typeof q.correct_answer === 'number'
          ? [q.correct_answer]
          : [0]

        const quizInfo = { quiz_id: String(quiz._id), course_code: quiz.course_code || quiz.title }

        if (!bankIdMap.has(qId)) {
          const entry: BankQuestionEntry = {
            question_id: qId,
            text: q.text,
            options: q.options,
            correct_answer: normalizedAnswer,
            explanation: q.explanation,
            quizzes: [quizInfo],
          }
          bankIdMap.set(qId, entry)
          const normText = normalizeTextAST(q.text)
          if (normText && !bankTextMap.has(normText)) {
            bankTextMap.set(normText, entry)
          }
        } else {
          const entry = bankIdMap.get(qId)!
          if (!entry.quizzes.some((qz) => qz.course_code === quizInfo.course_code)) {
            entry.quizzes.push(quizInfo)
          }
        }
      }
    }

    // 2. Evaluate each question in the uploaded payload against the question bank
    let newCount = 0
    let reusedCount = 0
    let conflictCount = 0

    const analysisDetails = questions.map((uploadedQ, index) => {
      const qId = generateQuestionId(uploadedQ)
      const normalizedUploadedText = normalizeTextAST(uploadedQ.text)
      const uploadedAnswerArray = Array.isArray(uploadedQ.correct_answer)
        ? uploadedQ.correct_answer
        : [uploadedQ.correct_answer]

      const uploadedAnswerTexts = getAnswerTexts(uploadedQ.options, uploadedAnswerArray)

      // Lookup: 1st by exact question_id, 2nd by normalized text + option overlap
      let existingInBank = bankIdMap.get(qId)
      if (!existingInBank && normalizedUploadedText) {
        const candidate = bankTextMap.get(normalizedUploadedText)
        if (candidate && hasOptionOverlap(uploadedQ.options, candidate.options)) {
          existingInBank = candidate
        }
      }

      if (!existingInBank) {
        newCount++
        return {
          questionIndex: index,
          question_id: qId,
          status: 'new' as const,
          message: 'Câu hỏi mới hoàn toàn (sẽ tự động thêm vào ngân hàng môn học)',
          uploaded: {
            text: uploadedQ.text,
            options: uploadedQ.options,
            correct_answer: uploadedAnswerArray,
            answer_texts: uploadedAnswerTexts,
            explanation: uploadedQ.explanation,
          },
        }
      }

      // Existing question found in Bank! Check if answers match
      const isSameAnswer = areAnswersSame(
        { options: uploadedQ.options, correct_answer: uploadedAnswerArray },
        { options: existingInBank.options, correct_answer: existingInBank.correct_answer }
      )

      const bankAnswerTexts = getAnswerTexts(existingInBank.options, existingInBank.correct_answer)

      if (isSameAnswer) {
        reusedCount++
        return {
          questionIndex: index,
          question_id: existingInBank.question_id,
          status: 'reused' as const,
          message: `Đã có trong ngân hàng môn (khớp đáp án: "${uploadedAnswerTexts.join(', ')}"${
            existingInBank.quizzes.length > 0 ? `, đang dùng trong ${existingInBank.quizzes.length} đề thi` : ''
          })`,
          uploaded: {
            text: uploadedQ.text,
            options: uploadedQ.options,
            correct_answer: uploadedAnswerArray,
            answer_texts: uploadedAnswerTexts,
            explanation: uploadedQ.explanation,
          },
          bank: {
            question_id: existingInBank.question_id,
            options: existingInBank.options,
            correct_answer: existingInBank.correct_answer,
            answer_texts: bankAnswerTexts,
            explanation: existingInBank.explanation,
            quizzes: existingInBank.quizzes,
          },
        }
      } else {
        conflictCount++
        return {
          questionIndex: index,
          question_id: existingInBank.question_id,
          status: 'conflict' as const,
          message: `Mâu thuẫn đáp án: File chọn "${uploadedAnswerTexts.join(', ')}" nhưng Ngân hàng chọn "${bankAnswerTexts.join(', ')}"`,
          uploaded: {
            text: uploadedQ.text,
            options: uploadedQ.options,
            correct_answer: uploadedAnswerArray,
            answer_texts: uploadedAnswerTexts,
            explanation: uploadedQ.explanation,
          },
          bank: {
            question_id: existingInBank.question_id,
            options: existingInBank.options,
            correct_answer: existingInBank.correct_answer,
            answer_texts: bankAnswerTexts,
            explanation: existingInBank.explanation,
            quizzes: existingInBank.quizzes,
          },
        }
      }
    })

    return NextResponse.json({
      total_questions: questions.length,
      new_questions_count: newCount,
      reused_questions_count: reusedCount,
      conflict_questions_count: conflictCount,
      details: analysisDetails,
    })
  } catch (error: any) {
    console.error('Error checking question bank:', error)
    return NextResponse.json(
      { error: error.message || 'Lỗi kiểm tra ngân hàng câu hỏi' },
      { status: 500 }
    )
  }
}, { roles: ['admin'] })
