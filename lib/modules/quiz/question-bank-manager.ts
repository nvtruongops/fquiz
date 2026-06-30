import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import { generateQuestionId, areAnswersSame } from '@/lib/modules/quiz/question-id-generator'
import type { Types } from 'mongoose'

function ensureArray(answers: number | number[]): number[] {
  return Array.isArray(answers) ? answers : [answers]
}

export interface QuestionInput {
  text: string
  options: string[]
  correct_answer: number | number[]
  explanation?: string
  image_url?: string
}

export interface ExistingQuestionInfo {
  _id: string
  text: string
  options: string[]
  correct_answer: number | number[]
  explanation?: string
  used_in_quizzes: string[]
  used_in_quiz_ids: string[]
  usage_count: number
}

export interface ConflictInfo {
  hasConflict: boolean
  existingQuestion?: ExistingQuestionInfo
  conflictType?: 'same_answer' | 'different_answer'
  message?: string
}

function formatUsedInQuizzes(existing: {
  used_in_quizzes: string[]
  used_in_quiz_ids?: string[]
  usage_count: number
}): string {
  const codes = existing.used_in_quizzes.length > 0
    ? existing.used_in_quizzes
    : []
  if (codes.length === 0) return `Đã được dùng trong ${existing.usage_count} quiz`
  const display = codes.slice(0, 3).join(', ')
  return codes.length > 3
    ? `${display}... (+${codes.length - 3} khác)`
    : display
}

/**
 * Kiểm tra câu hỏi có tồn tại trong ngân hàng của môn học không
 * 
 * Layer 1: Tìm bằng question_id (hash text + sorted options)
 * Layer 2: So sánh đáp án theo TEXT (không phải index) để tránh false conflict
 */
export async function checkQuestionInBank(
  categoryId: Types.ObjectId | string,
  question: QuestionInput
): Promise<ConflictInfo> {
  const questionId = generateQuestionId(question)
  
  const existing = await QuestionBank.findOne({
    category_id: categoryId,
    question_id: questionId
  }).lean()
  
  if (!existing) {
    return { hasConflict: false }
  }

  const existingInfo: ExistingQuestionInfo = {
    _id: String(existing._id),
    text: existing.text,
    options: existing.options,
    correct_answer: existing.correct_answer,
    explanation: existing.explanation,
    used_in_quizzes: existing.used_in_quizzes || [],
    used_in_quiz_ids: (existing.used_in_quiz_ids || []).map((id: any) => String(id)),
    usage_count: existing.usage_count
  }
  
  // Layer 2: So sánh đáp án theo TEXT (không phải index)
  const sameAnswer = areAnswersSame(
    { options: question.options, correct_answer: question.correct_answer },
    { options: existing.options, correct_answer: existing.correct_answer }
  )
  
  if (sameAnswer) {
    return {
      hasConflict: true,
      existingQuestion: existingInfo,
      conflictType: 'same_answer',
      message: `Câu hỏi này đã tồn tại trong môn học với cùng đáp án. ${formatUsedInQuizzes(existingInfo)}`
    }
  }
  
  return {
    hasConflict: true,
    existingQuestion: existingInfo,
    conflictType: 'different_answer',
    message: ` MÂU THUẪN: Câu hỏi tương tự đã tồn tại nhưng có đáp án khác!\n` +
             `Đáp án hiện tại: ${ensureArray(question.correct_answer).map((i: number) => question.options[i] || `[${i}]`).join(', ')}\n` +
             `Đáp án trong ngân hàng: ${ensureArray(existing.correct_answer).map((i: number) => existing.options[i] || `[${i}]`).join(', ')}\n` +
             `${formatUsedInQuizzes(existingInfo)}`
  }
}

/**
 * Kiểm tra nhiều câu hỏi cùng lúc (cho import quiz)
 */
export async function checkQuestionsInBank(
  categoryId: Types.ObjectId | string,
  questions: QuestionInput[]
): Promise<Map<number, ConflictInfo>> {
  const conflicts = new Map<number, ConflictInfo>()
  
  // Tạo question_ids cho tất cả câu hỏi
  const questionIds = questions.map(q => generateQuestionId(q))
  
  // Lấy tất cả câu hỏi đã có trong ngân hàng (1 query duy nhất)
  const existingQuestions = await QuestionBank.find({
    category_id: categoryId,
    question_id: { $in: questionIds }
  }).lean()
  
  // Tạo map để lookup nhanh
  const existingMap = new Map(
    existingQuestions.map(q => [q.question_id, q])
  )
  
  // Kiểm tra từng câu hỏi
  questions.forEach((question, index) => {
    const questionId = questionIds[index]
    const existing = existingMap.get(questionId)
    
    if (!existing) {
      return // Không có conflict
    }
    
    // Layer 2: So sánh đáp án theo TEXT
    const sameAnswer = areAnswersSame(
      { options: question.options, correct_answer: question.correct_answer },
      { options: existing.options, correct_answer: existing.correct_answer }
    )
    
    conflicts.set(index, {
      hasConflict: true,
      existingQuestion: {
        _id: String(existing._id),
        text: existing.text,
        options: existing.options,
        correct_answer: existing.correct_answer,
        explanation: existing.explanation,
        used_in_quizzes: existing.used_in_quizzes || [],
        used_in_quiz_ids: (existing.used_in_quiz_ids || []).map((id: any) => String(id)),
        usage_count: existing.usage_count
      },
      conflictType: sameAnswer ? 'same_answer' : 'different_answer',
      message: sameAnswer
        ? `Câu ${index + 1}: Đã tồn tại (dùng ${existing.usage_count} lần)`
        : ` Câu ${index + 1}: MÂU THUẪN đáp án với câu đã có trong ngân hàng!`
    })
  })
  
  return conflicts
}

/**
 * Thêm hoặc cập nhật câu hỏi vào ngân hàng
 */
export async function addOrUpdateQuestionInBank(
  categoryId: Types.ObjectId | string,
  question: QuestionInput,
  courseCode: string,
  userId: Types.ObjectId | string,
  quizId?: Types.ObjectId | string
): Promise<{ _id: string; isNew: boolean }> {
  const questionId = generateQuestionId(question)

  const existing = await QuestionBank.findOne({
    category_id: categoryId,
    question_id: questionId
  })

  if (existing) {
    await QuestionBank.updateOne(
      { _id: existing._id },
      {
        $addToSet: {
          used_in_quizzes: courseCode,
          ...(quizId ? { used_in_quiz_ids: quizId } : {}),
        },
      }
    )

    const updated = await QuestionBank.findById(existing._id)
    if (updated) {
      const newCount = updated.used_in_quiz_ids && updated.used_in_quiz_ids.length > 0
        ? updated.used_in_quiz_ids.length
        : updated.used_in_quizzes.length
      if (updated.usage_count !== newCount) {
        updated.usage_count = newCount
        await updated.save()
      }
    }

    return { _id: String(existing._id), isNew: false }
  }

  const newQuestion = await QuestionBank.create({
    category_id: categoryId,
    question_id: questionId,
    text: question.text,
    options: question.options,
    correct_answer: question.correct_answer,
    explanation: question.explanation,
    image_url: question.image_url,
    created_by: userId,
    usage_count: 1,
    used_in_quizzes: [courseCode],
    used_in_quiz_ids: quizId ? [quizId] : [],
  })

  return { _id: String(newQuestion._id), isNew: true }
}

/**
 * Đồng bộ tất cả câu hỏi của quiz vào ngân hàng
 */
export async function syncQuizToQuestionBank(
  categoryId: Types.ObjectId | string,
  courseCode: string,
  questions: QuestionInput[],
  userId: Types.ObjectId | string,
  quizId?: Types.ObjectId | string
): Promise<{
  synced: number
  new: number
  existing: number
  conflicts: ConflictInfo[]
}> {
  let newCount = 0
  let existingCount = 0
  const conflicts: ConflictInfo[] = []
  
  for (const question of questions) {
    const conflict = await checkQuestionInBank(categoryId, question)
    
    if (conflict.hasConflict && conflict.conflictType === 'different_answer') {
      conflicts.push(conflict)
      continue // Không sync câu hỏi có mâu thuẫn
    }
    
    const result = await addOrUpdateQuestionInBank(
      categoryId,
      question,
      courseCode,
      userId,
      quizId
    )
    
    if (result.isNew) {
      newCount++
    } else {
      existingCount++
    }
  }
  
  return {
    synced: newCount + existingCount,
    new: newCount,
    existing: existingCount,
    conflicts
  }
}

/**
 * Lấy câu hỏi phổ biến nhất trong môn học
 */
export async function getPopularQuestions(
  categoryId: Types.ObjectId | string,
  limit: number = 10
) {
  return QuestionBank.find({ category_id: categoryId })
    .sort({ usage_count: -1 })
    .limit(limit)
    .lean()
}

/**
 * Đổi tên course_code trong tracking của ngân hàng (khi quiz đổi mã).
 * Rename in-place để giữ nguyên usage_count, used_in_quiz_ids — tránh sinh rác
 * (mã cũ còn sót lại trong used_in_quizzes khi quiz được đổi tên).
 */
export async function renameQuizCodeInBank(
  categoryId: Types.ObjectId | string,
  oldCode: string,
  newCode: string
) {
  const normalizedOld = oldCode.trim().toUpperCase()
  const normalizedNew = newCode.trim().toUpperCase()
  if (!normalizedOld || normalizedOld === normalizedNew) return

  // Docs already containing the new code: just drop the old code (avoid dupes).
  await QuestionBank.updateMany(
    {
      category_id: categoryId,
      used_in_quizzes: { $all: [normalizedOld, normalizedNew] },
    },
    { $pull: { used_in_quizzes: normalizedOld } }
  )

  // Docs with only the old code: rename it in-place via the positional operator.
  await QuestionBank.updateMany(
    {
      category_id: categoryId,
      used_in_quizzes: normalizedOld,
    },
    { $set: { 'used_in_quizzes.$': normalizedNew } }
  )
}

/**
 * Xóa quiz khỏi usage tracking
 */
export async function removeQuizFromBank(
  categoryId: Types.ObjectId | string,
  courseCode: string,
  quizId?: Types.ObjectId | string
) {
  // Get affected docs BEFORE updating
  const affectedDocs = await QuestionBank.find({
    category_id: categoryId,
    $or: [
      { used_in_quizzes: courseCode },
      ...(quizId ? [{ used_in_quiz_ids: quizId }] : []),
    ],
  })

  for (const doc of affectedDocs) {
    const oldQuizIds = (doc.used_in_quiz_ids || []).map((id: any) => String(id))
    const oldCodes = doc.used_in_quizzes || []

    doc.used_in_quizzes = oldCodes.filter((c: string) => c !== courseCode)
    doc.used_in_quiz_ids = oldQuizIds
      .filter((id: string) => !quizId || id !== String(quizId))
      .map((id: string) => id as any)

    const newCount = doc.used_in_quiz_ids.length > 0
      ? doc.used_in_quiz_ids.length
      : doc.used_in_quizzes.length

    if (newCount === 0) {
      await QuestionBank.deleteOne({ _id: doc._id })
    } else if (doc.usage_count !== newCount) {
      doc.usage_count = newCount
      await doc.save()
    } else {
      await doc.save()
    }
  }
}
