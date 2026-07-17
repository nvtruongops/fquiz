import mongoose from 'mongoose'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { Category } from '@/lib/modules/quiz/models/Category'
import type { IUserService } from '@/lib/modules/quiz/services/IUserService'

export type SourceType = 'self_created' | 'saved_explore' | 'explore_public'

export function inferSourceType(quiz: any, studentUserId: string): SourceType {
  if (quiz?.is_saved_from_explore) return 'saved_explore'
  if (quiz?.created_by?.toString?.() === studentUserId) return 'self_created'
  return 'explore_public'
}

export function sourceLabelFromType(sourceType: SourceType): string {
  if (sourceType === 'self_created') return 'Tự tạo'
  return 'Từ Explore'
}

/**
 * Extract display code from mix quiz title.
 * "Quiz Trộn · MLN122_SP26_C1_FE + MLN122_SP26_C2_FE" → "MLN122_SP26_C1_FE + ..."
 * Truncates to keep it readable.
 */
export function mixQuizDisplayCode(title: string): string {
  const prefix = 'Quiz Trộn · '
  const raw = title.startsWith(prefix) ? title.slice(prefix.length) : title
  if (raw.length > 40) return raw.slice(0, 37) + '...'
  return raw
}

/**
 * Fetch original-source creators for quizzes saved from Explore.
 * Returns a map of originalQuizId → creator userId.
 */
export async function buildOriginalCreatorMap(quizzes: any[]): Promise<Map<string, string | null>> {
  const originalSourceIds = Array.from(
    new Set(
      quizzes
        .filter((quiz) => quiz?.is_saved_from_explore && quiz?.original_quiz_id)
        .map((quiz) => quiz.original_quiz_id.toString())
    )
  ).map((id) => new mongoose.Types.ObjectId(id))

  if (originalSourceIds.length === 0) return new Map()

  const originalSources = await Quiz.find({ _id: { $in: originalSourceIds } }, { created_by: 1 }).lean()
  return new Map(
    (originalSources as any[]).map((q) => [q._id.toString(), q.created_by?.toString?.() ?? null])
  )
}

/**
 * Fetch category names for a set of category ObjectIds.
 */
export async function buildCategoryNameMap(categoryIds: string[]): Promise<Map<string, string>> {
  const ids = Array.from(new Set(categoryIds.filter(Boolean))).map((id) => new mongoose.Types.ObjectId(id))
  if (ids.length === 0) return new Map()

  const categories = await Category.find({ _id: { $in: ids } }, { name: 1 }).lean()
  return new Map((categories as any[]).map((category) => [category._id.toString(), category.name]))
}

/**
 * Fetch display usernames for all source creators (own + original).
 * Requires the originalCreatorMap to resolve saved-from-explore creators.
 */
export async function buildCreatorNameMap(
  quizzes: any[],
  originalCreatorMap: Map<string, string | null>,
  userService: IUserService
): Promise<Map<string, string>> {
  const sourceCreatorIds = Array.from(
    new Set(
      quizzes
        .map((quiz) => {
          if (quiz?.is_saved_from_explore && quiz?.original_quiz_id) {
            return originalCreatorMap.get(quiz.original_quiz_id.toString()) ?? null
          }
          return quiz?.created_by?.toString?.() ?? null
        })
        .filter((id): id is string => Boolean(id))
    )
  )

  if (sourceCreatorIds.length === 0) return new Map()

  return userService.getUsernames(sourceCreatorIds)
}

/**
 * Resolve the source creator userId for a single quiz.
 */
export function resolveSourceCreatorId(
  quiz: any,
  originalCreatorMap: Map<string, string | null>
): string | null {
  if (quiz?.is_saved_from_explore) {
    return originalCreatorMap.get(quiz?.original_quiz_id?.toString?.() ?? '') ?? null
  }
  return quiz?.created_by?.toString?.() ?? null
}
