import { QuestionBank } from '@/models/QuestionBank'
import { generateQuestionId, areAnswersSame } from '@/lib/question-id-generator'
import type { Types } from 'mongoose'

export interface QuestionInput {
  text: string
  options: string[]
  correct_answer: number[]
  explanation?: string
  image_url?: string
}

export interface ConflictInfo {
  hasConflict: boolean
  existingQuestion?: {
    _id: string
    text: string
    options: string[]
    correct_answer: number[]
    explanation?: string
    used_in_quizzes: string[]
    usage_count: number
  }
  conflictType?: 'same_answer' | 'different_answer'
  message?: string
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
  
  // Layer 2: So sánh đáp án theo TEXT (không phải index)
  // Tránh false conflict khi options bị đổi thứ tự giữa các quiz
  const sameAnswer = areAnswersSame(
    { options: question.options, correct_answer: question.correct_answer },
    { options: existing.options, correct_answer: existing.correct_answer }
  )
  
  if (sameAnswer) {
    return {
      hasConflict: true,
      existingQuestion: {
        _id: String(existing._id),
        text: existing.text,
        options: existing.options,
        correct_answer: existing.correct_answer,
        explanation: existing.explanation,
        used_in_quizzes: existing.used_in_quizzes,
        usage_count: existing.usage_count
      },
      conflictType: 'same_answer',
      message: `Câu hỏi này đã tồn tại trong môn học với cùng đáp án. Đã được sử dụng trong ${existing.usage_count} quiz: ${existing.used_in_quizzes.slice(0, 3).join(', ')}${existing.usage_count > 3 ? '...' : ''}`
    }
  }
  
  // Cùng câu hỏi + cùng options nhưng khác đáp án → CONFLICT thực sự
  return {
    hasConflict: true,
    existingQuestion: {
      _id: String(existing._id),
      text: existing.text,
      options: existing.options,
      correct_answer: existing.correct_answer,
      explanation: existing.explanation,
      used_in_quizzes: existing.used_in_quizzes,
      usage_count: existing.usage_count
    },
    conflictType: 'different_answer',
    message: ` MÂU THUẪN: Câu hỏi tương tự đã tồn tại nhưng có đáp án khác!\n` +
             `Đáp án hiện tại: ${question.correct_answer.map((i: number) => question.options[i] || `[${i}]`).join(', ')}\n` +
             `Đáp án trong ngân hàng: ${existing.correct_answer.map((i: number) => existing.options[i] || `[${i}]`).join(', ')}\n` +
             `Đã được dùng trong: ${existing.used_in_quizzes.join(', ')}`
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
        used_in_quizzes: existing.used_in_quizzes,
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
  userId: Types.ObjectId | string
): Promise<{ _id: string; isNew: boolean }> {
  const questionId = generateQuestionId(question)
  
  const existing = await QuestionBank.findOne({
    category_id: categoryId,
    question_id: questionId
  })
  
  if (existing) {
    // Cập nhật usage
    if (!existing.used_in_quizzes.includes(courseCode)) {
      existing.used_in_quizzes.push(courseCode)
      existing.usage_count += 1
    }
    await existing.save()
    
    return { _id: String(existing._id), isNew: false }
  }
  
  // Tạo mới
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
    used_in_quizzes: [courseCode]
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
  userId: Types.ObjectId | string
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
      userId
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
 * Xóa quiz khỏi usage tracking
 */
export async function removeQuizFromBank(
  categoryId: Types.ObjectId | string,
  courseCode: string
) {
  await QuestionBank.updateMany(
    {
      category_id: categoryId,
      used_in_quizzes: courseCode
    },
    {
      $pull: { used_in_quizzes: courseCode },
      $inc: { usage_count: -1 }
    }
  )
}
