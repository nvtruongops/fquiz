import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { getPublicQuizFilter } from '@/lib/modules/quiz/utils/public-quiz-filter'

export interface QuestionUsageResult {
  count: number
  quizzes: string[]
}

export interface QuestionUsageQueryItem {
  question_id?: string
  text?: string
}

export type QuestionUsageQuery = string | QuestionUsageQueryItem

/**
 * QuestionUsageService
 * Single Source of Truth resolver for question usage across public quizzes.
 *
 * Rules:
 * 1. Count is strictly equal to unique public course_code array length (count === quizzes.length).
 * 2. Only public quizzes matching getPublicQuizFilter() are counted.
 * 3. Supports lookup by exact question_id AND question text to bridge QuestionBank cache and Quiz collection seamlessly.
 * 4. Combines results from both QuestionBank (denormalized fast cache) and direct Quiz collection queries.
 */
const usageCache = new Map<string, { result: QuestionUsageResult; expiresAt: number }>()
const USAGE_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export class QuestionUsageService {
  /**
   * Clear in-memory cache (useful for testing or cache resets)
   */
  static clearCache(): void {
    usageCache.clear()
  }

  /**
   * Normalize course code and filter out invalid/temporary codes
   */
  private static normalizeCourseCode(code: unknown): string | null {
    if (typeof code !== 'string') return null
    const trimmed = code.trim().toUpperCase()
    if (!trimmed || trimmed.startsWith('MIX_') || trimmed.startsWith('TEMP_')) return null
    return trimmed
  }

  /**
   * Get public quiz usage for a single question item (question_id string or object with question_id/text)
   */
  static async getQuestionPublicUsage(
    query: QuestionUsageQuery,
    currentCourseCode?: string
  ): Promise<QuestionUsageResult> {
    if (!query) {
      return { count: 0, quizzes: [] }
    }
    const map = await this.getBatchQuestionPublicUsage([query], currentCourseCode)
    const key = typeof query === 'string' ? query : query.question_id || query.text || ''
    return map.get(key) || { count: 0, quizzes: [] }
  }

  /**
   * Get public quiz usage for a batch of question items
   */
  static async getBatchQuestionPublicUsage(
    items: QuestionUsageQuery[],
    currentCourseCode?: string
  ): Promise<Map<string, QuestionUsageResult>> {
    const resultMap = new Map<string, QuestionUsageResult>()
    if (!Array.isArray(items) || items.length === 0) {
      return resultMap
    }

    const validCurrentCode = this.normalizeCourseCode(currentCourseCode)
    const now = Date.now()

    // 1. Resolve from in-memory cache first
    const missingItems: QuestionUsageQuery[] = []
    for (const item of items) {
      const qId = typeof item === 'string' ? item.trim() : (item?.question_id || '').trim()
      const qText = typeof item === 'object' && item?.text ? item.text.trim() : ''
      const cacheKey = `${validCurrentCode || ''}:${qId || qText}`

      const cached = usageCache.get(cacheKey)
      if (cached && cached.expiresAt > now) {
        if (typeof item === 'string') {
          resultMap.set(item, cached.result)
        } else if (item && typeof item === 'object') {
          if (item.question_id) resultMap.set(item.question_id, cached.result)
          if (item.text) resultMap.set(item.text, cached.result)
        }
      } else {
        missingItems.push(item)
      }
    }

    if (missingItems.length === 0) {
      return resultMap
    }

    // Extract valid search keys from items not in cache
    const validIds: string[] = []
    const validTexts: string[] = []

    for (const item of missingItems) {
      if (typeof item === 'string') {
        const trimmed = item.trim()
        if (trimmed.length > 0) validIds.push(trimmed)
      } else if (item && typeof item === 'object') {
        if (typeof item.question_id === 'string' && item.question_id.trim().length > 0) {
          validIds.push(item.question_id.trim())
        }
        if (typeof item.text === 'string' && item.text.trim().length > 0) {
          validTexts.push(item.text.trim())
        }
      }
    }

    const uniqueIds = Array.from(new Set(validIds))
    const uniqueTexts = Array.from(new Set(validTexts))

    if (uniqueIds.length === 0 && uniqueTexts.length === 0) {
      return resultMap
    }

    // Build parallel database queries
    const bankOr: Record<string, unknown>[] = []
    if (uniqueIds.length > 0) bankOr.push({ question_id: { $in: uniqueIds } })
    if (uniqueTexts.length > 0) bankOr.push({ text: { $in: uniqueTexts } })

    const quizOr: Record<string, unknown>[] = []
    if (uniqueIds.length > 0) quizOr.push({ 'questions.question_id': { $in: uniqueIds } })
    if (uniqueTexts.length > 0) quizOr.push({ 'questions.text': { $in: uniqueTexts } })

    const [bankDocs, publicQuizzes] = await Promise.all([
      bankOr.length > 0
        ? QuestionBank.find({ $or: bankOr })
            .select('question_id text used_in_quizzes')
            .lean()
        : [],
      quizOr.length > 0
        ? Quiz.find({
            ...getPublicQuizFilter(),
            $or: quizOr,
          })
            .select('course_code questions.question_id questions.text')
            .lean()
        : [],
    ])

    // Aggregate matches for each item
    for (const item of missingItems) {
      const qId = typeof item === 'string' ? item.trim() : (item?.question_id || '').trim()
      const qText = typeof item === 'object' && item?.text ? item.text.trim() : ''

      if (!qId && !qText) continue

      const codeSet = new Set<string>()

      // 1. Check QuestionBank docs
      for (const doc of bankDocs as any[]) {
        const matchId = qId && doc.question_id === qId
        const matchText = qText && doc.text && doc.text.trim() === qText

        if (matchId || matchText) {
          for (const c of doc.used_in_quizzes || []) {
            const norm = QuestionUsageService.normalizeCourseCode(c)
            if (norm) codeSet.add(norm)
          }
        }
      }

      // 2. Check Public Quizzes docs
      for (const quiz of publicQuizzes as any[]) {
        const normCode = QuestionUsageService.normalizeCourseCode(quiz.course_code)
        if (!normCode) continue

        if (Array.isArray(quiz.questions)) {
          const hasMatch = quiz.questions.some(
            (q: any) =>
              (qId && q.question_id === qId) ||
              (qText && typeof q.text === 'string' && q.text.trim() === qText)
          )
          if (hasMatch) {
            codeSet.add(normCode)
          }
        }
      }

      // 3. Fallback/Include current quiz course code if available
      if (validCurrentCode) {
        codeSet.add(validCurrentCode)
      }

      const uniqueCodes = Array.from(codeSet)
      const usageResult: QuestionUsageResult = {
        count: uniqueCodes.length,
        quizzes: uniqueCodes,
      }

      if (typeof item === 'string') {
        resultMap.set(item, usageResult)
        usageCache.set(`${validCurrentCode || ''}:${item}`, { result: usageResult, expiresAt: now + USAGE_CACHE_TTL_MS })
      } else if (item && typeof item === 'object') {
        if (item.question_id) {
          resultMap.set(item.question_id, usageResult)
          usageCache.set(`${validCurrentCode || ''}:${item.question_id}`, { result: usageResult, expiresAt: now + USAGE_CACHE_TTL_MS })
        }
        if (item.text) {
          resultMap.set(item.text, usageResult)
          usageCache.set(`${validCurrentCode || ''}:${item.text}`, { result: usageResult, expiresAt: now + USAGE_CACHE_TTL_MS })
        }
      }
    }

    return resultMap
  }
}
