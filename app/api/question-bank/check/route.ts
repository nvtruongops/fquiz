import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { verifyToken } from '@/lib/modules/auth/auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { checkQuestionsInBank } from '@/lib/modules/quiz/question-bank-manager'
import { generateQuestionId, getAnswerTexts } from '@/lib/modules/quiz/question-id-generator'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { z } from 'zod'

const CheckQuestionsSchema = z.object({
  category_id: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid category ID'),
  questions: z.array(z.object({
    text: z.string().min(1),
    options: z.array(z.string()).min(2),
    correct_answer: z.array(z.number().int().min(0)),
    explanation: z.string().optional(),
    image_url: z.string().optional(),
  })).min(1)
})

/**
 * POST /api/question-bank/check
 * Kiểm tra danh sách câu hỏi có tồn tại trong ngân hàng không
 * Trả về conflicts nếu có
 */
export async function POST(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = CheckQuestionsSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: parsed.error.issues 
      }, { status: 400 })
    }

    const { category_id, questions } = parsed.data

    await connectDB()

    // Kiểm tra tất cả câu hỏi
    const conflicts = await checkQuestionsInBank(category_id, questions)

    // Phân loại conflicts + gom nhóm variants cho từng conflict
    const sameAnswerConflicts: any[] = []
    const differentAnswerConflicts: any[] = []

    const categoryObjectId = new mongoose.Types.ObjectId(category_id)
    const conflictQuestionIds = new Map<number, string>()

    conflicts.forEach((_conflict, index) => {
      conflictQuestionIds.set(index, generateQuestionId(questions[index]))
    })

    // Lấy tất cả quiz variants cho các câu hỏi conflict
    const quizzes = await Quiz.find({
      category_id: categoryObjectId,
      is_temp: { $ne: true },
      is_saved_from_explore: { $ne: true },
    })
      .select('course_code questions')
      .lean()

    const answerVariantsByQuestionId = new Map<string, Array<{
      correct_answer: number[]
      answer_texts: string[]
      count: number
      quizzes: string[]
      options: string[]
    }>>()

    // Gom nhóm từng variant theo question text (không dùng question_id vì options có thể khác thứ tự)
    for (const quiz of quizzes) {
      if (!Array.isArray(quiz.questions)) continue
      for (const q of quiz.questions as any[]) {
        if (!q.text || !Array.isArray(q.options)) continue
        const qText = q.text.trim().toLowerCase().replace(/\s+/g, ' ')
        const qInput = questions.find(qi => qi.text.trim().toLowerCase().replace(/\s+/g, ' ') === qText)
        if (!qInput) continue

        const qid = generateQuestionId({
          text: q.text,
          options: q.options,
        })
        // Check if this question matches any conflict
        let matchesConflict = false
        for (const [, conflictQid] of conflictQuestionIds) {
          if (conflictQid === qid) { matchesConflict = true; break }
        }
        if (!matchesConflict) continue

        const answerKey = JSON.stringify(getAnswerTexts(q.options, q.correct_answer || []))
        if (!answerVariantsByQuestionId.has(qid)) {
          answerVariantsByQuestionId.set(qid, [])
        }
        const variants = answerVariantsByQuestionId.get(qid)!

        const existingVariant = variants.find(v => JSON.stringify(v.answer_texts.sort()) === JSON.stringify(getAnswerTexts(q.options, q.correct_answer || []).sort()))
        if (existingVariant) {
          existingVariant.count++
          if (!existingVariant.quizzes.includes(quiz.course_code)) {
            existingVariant.quizzes.push(quiz.course_code)
          }
        } else {
          variants.push({
            correct_answer: q.correct_answer || [],
            answer_texts: getAnswerTexts(q.options, q.correct_answer || []),
            count: 1,
            quizzes: [quiz.course_code],
            options: q.options,
          })
        }
      }
    }

    conflicts.forEach((conflict, index) => {
      const qid = conflictQuestionIds.get(index) || ''
      const answerVariants = answerVariantsByQuestionId.get(qid) || []

      const conflictData = {
        questionIndex: index,
        question: questions[index],
        ...conflict,
        answerVariants: answerVariants.length > 0 ? answerVariants : undefined,
      }

      if (conflict.conflictType === 'same_answer') {
        sameAnswerConflicts.push(conflictData)
      } else if (conflict.conflictType === 'different_answer') {
        differentAnswerConflicts.push(conflictData)
      }
    })

    return NextResponse.json({
      total_questions: questions.length,
      conflicts_found: conflicts.size,
      same_answer_conflicts: sameAnswerConflicts.length,
      different_answer_conflicts: differentAnswerConflicts.length,
      conflicts: {
        same_answer: sameAnswerConflicts,
        different_answer: differentAnswerConflicts
      },
      summary: differentAnswerConflicts.length > 0
        ? ` Phát hiện ${differentAnswerConflicts.length} câu hỏi có mâu thuẫn đáp án!`
        : sameAnswerConflicts.length > 0
          ? `✅ ${sameAnswerConflicts.length} câu hỏi đã tồn tại trong ngân hàng (có thể tái sử dụng)`
          : '✅ Tất cả câu hỏi đều mới'
    })
  } catch (error: any) {
    console.error('Error checking question bank:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
