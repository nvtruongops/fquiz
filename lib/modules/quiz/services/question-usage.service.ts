import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { getPublicQuizFilter } from '@/lib/modules/quiz/utils/public-quiz-filter'

export interface QuestionUsageResult {
  count: number
  quizzes: string[]
}

/**
 * QuestionUsageService
 * Single Source of Truth resolver for question usage across public quizzes.
 *
 * Rules:
 * 1. Count is strictly equal to unique public course_code array length (count === quizzes.length).
 * 2. Only public quizzes matching getPublicQuizFilter() are counted.
 * 3. QuestionBank is used as a fast denormalized cache, falling back to direct Quiz collection query.
 */
export class QuestionUsageService {
  /**
   * Get public quiz usage for a single question_id
   */
  static async getQuestionPublicUsage(questionId: string): Promise<QuestionUsageResult> {
    if (!questionId) {
      return { count: 0, quizzes: [] }
    }
    const map = await this.getBatchQuestionPublicUsage([questionId])
    return map.get(questionId) || { count: 0, quizzes: [] }
  }

  /**
   * Get public quiz usage for a batch of question_ids using single Mongo queries
   */
  static async getBatchQuestionPublicUsage(
    questionIds: string[]
  ): Promise<Map<string, QuestionUsageResult>> {
    const resultMap = new Map<string, QuestionUsageResult>()
    const validIds = Array.from(
      new Set((questionIds || []).filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
    )

    if (validIds.length === 0) {
      return resultMap
    }

    // Initialize all IDs with empty default
    validIds.forEach((id) => resultMap.set(id, { count: 0, quizzes: [] }))

    // 1. Primary lookup via QuestionBank (denormalized cache)
    const bankDocs = await QuestionBank.find({
      question_id: { $in: validIds },
    })
      .select('question_id used_in_quizzes')
      .lean()

    const missingIds: string[] = []

    for (const doc of bankDocs) {
      const uniqueCodes: string[] = Array.from(
        new Set<string>(
          (doc.used_in_quizzes || [])
            .map((c: string) => (typeof c === 'string' ? c.trim().toUpperCase() : ''))
            .filter((c: string) => c.length > 0 && !c.startsWith('MIX_') && !c.startsWith('TEMP_'))
        )
      )

      if (uniqueCodes.length > 0) {
        resultMap.set(doc.question_id, {
          count: uniqueCodes.length,
          quizzes: uniqueCodes,
        })
      } else {
        missingIds.push(doc.question_id)
      }
    }

    // Determine IDs that weren't found in QuestionBank cache or had empty cache
    validIds.forEach((id) => {
      if (!bankDocs.some((d) => d.question_id === id)) {
        missingIds.push(id)
      }
    })

    // 2. Direct Fallback Query to Quiz Collection for missing IDs
    if (missingIds.length > 0) {
      const publicQuizzes = await Quiz.find({
        ...getPublicQuizFilter(),
        $or: [
          { 'questions.question_id': { $in: missingIds } },
        ],
      })
        .select('course_code questions.question_id')
        .lean()

      const directMap = new Map<string, Set<string>>()
      missingIds.forEach((id) => directMap.set(id, new Set()))

      for (const quiz of publicQuizzes) {
        const code = (quiz.course_code || '').trim().toUpperCase()
        if (!code || code.startsWith('MIX_') || code.startsWith('TEMP_')) continue

        if (Array.isArray(quiz.questions)) {
          for (const q of quiz.questions) {
            if (q.question_id && directMap.has(q.question_id)) {
              directMap.get(q.question_id)?.add(code)
            }
          }
        }
      }

      directMap.forEach((codeSet, qid) => {
        const uniqueCodes: string[] = Array.from(codeSet)
        if (uniqueCodes.length > 0) {
          resultMap.set(qid, {
            count: uniqueCodes.length,
            quizzes: uniqueCodes,
          })
        }
      })
    }

    return resultMap
  }
}
