import { Types } from 'mongoose'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { getPublicQuizFilter } from './public-quiz-filter'

export function getStudentQuizVisibilityFilter(userId: string, temporaryQuizIds: unknown[] = []) {
  const userObjectId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId
  return {
    status: { $ne: 'deleted' },
    $or: [
      getPublicQuizFilter(),
      { created_by: userObjectId },
      ...(temporaryQuizIds.length > 0 ? [{ is_temp: true, _id: { $in: temporaryQuizIds } }] : []),
    ],
  }
}

export function getUnexpiredQuizSessionFilter(now = new Date()) {
  return {
    $or: [
      { expires_at: { $exists: false } },
      { expires_at: null },
      { expires_at: { $gt: now } },
    ],
  }
}

export async function findStudentAccessibleQuiz(quizId: string, userId: string) {
  if (!Types.ObjectId.isValid(quizId) || !Types.ObjectId.isValid(userId)) return null
  const quizObjectId = new Types.ObjectId(quizId)
  const userObjectId = new Types.ObjectId(userId)
  const hasTemporarySession = await QuizSession.exists({
    quiz_id: quizObjectId,
    student_id: userObjectId,
    is_temp: true,
    ...getUnexpiredQuizSessionFilter(),
  })
  const or: Record<string, unknown>[] = [
    getPublicQuizFilter(),
    { created_by: userObjectId },
    ...(hasTemporarySession ? [{ is_temp: true }] : []),
  ]

  return Quiz.findOne({
    _id: quizObjectId,
    status: { $ne: 'deleted' },
    $or: or,
  })
    .select('_id title course_code questions question_refs is_temp is_public status created_by is_saved_from_explore original_quiz_id')
    .lean() as any
}
