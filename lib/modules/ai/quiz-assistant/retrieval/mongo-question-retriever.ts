import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank' // ponytail: allow-cross-module
import { Quiz } from '@/lib/modules/quiz/models/Quiz' // ponytail: allow-cross-module
import type { IRetrievalEngine, RetrievalInput, RetrievalResult, DetailedRetrievalOutput } from './retrieval-types'
import { calculateRelevanceScore, calculateRelevanceBreakdown, rankRetrievalCandidates } from './ranking'
import type { SubSourceDurations } from '../telemetry/telemetry-types'

export class MongoQuestionRetriever implements IRetrievalEngine {
  private timeoutMs: number

  constructor(timeoutMs: number = 300) {
    this.timeoutMs = timeoutMs
  }

  async search(input: RetrievalInput): Promise<RetrievalResult[]> {
    const detailed = await this.searchDetailed(input)
    return detailed.evidences
  }

  async searchDetailed(input: RetrievalInput): Promise<DetailedRetrievalOutput> {
    const { courseCode, categoryId, currentQuestionText, targetOptionText, limit = 2 } = input

    let qbStart = performance.now()
    let qbDuration = 0
    let qbStatus: 'fulfilled' | 'rejected' | 'timeout' | 'skipped' = 'skipped'

    let quizStart = performance.now()
    let quizDuration = 0
    let quizStatus: 'fulfilled' | 'rejected' | 'timeout' | 'skipped' = 'skipped'

    const qbPromise = (async () => {
      qbStart = performance.now()
      const res = await this.queryQuestionBank(input, this.timeoutMs)
      qbDuration = Number((performance.now() - qbStart).toFixed(2))
      qbStatus = 'fulfilled'
      return res
    })().catch((err) => {
      qbDuration = Number((performance.now() - qbStart).toFixed(2))
      qbStatus = err.message?.includes('Timeout') ? 'timeout' : 'rejected'
      throw err
    })

    const quizPromise = (async () => {
      quizStart = performance.now()
      const res = await this.queryCourseQuizzes(input, this.timeoutMs)
      quizDuration = Number((performance.now() - quizStart).toFixed(2))
      quizStatus = 'fulfilled'
      return res
    })().catch((err) => {
      quizDuration = Number((performance.now() - quizStart).toFixed(2))
      quizStatus = err.message?.includes('Timeout') ? 'timeout' : 'rejected'
      throw err
    })

    // Invariant 5: Parallel Retrieval with Promise.allSettled (Partial Failure Resiliency)
    const results = await Promise.allSettled([qbPromise, quizPromise])

    const candidates: RetrievalResult[] = []
    let hasPartialFailure = false

    for (const res of results) {
      if (res.status === 'fulfilled') {
        candidates.push(...res.value)
      } else {
        hasPartialFailure = true
        console.warn('[MongoQuestionRetriever] Partial source retrieval failed:', res.reason)
      }
    }

    // De-duplicate by question text / sourceId
    const seen = new Set<string>()
    const uniqueCandidates: RetrievalResult[] = []

    for (const c of candidates) {
      // Exclude current question being taken
      if (c.content.trim().toLowerCase() === currentQuestionText.trim().toLowerCase()) continue
      const dedupKey = c.content.trim().toLowerCase()
      if (!seen.has(dedupKey)) {
        seen.add(dedupKey)
        uniqueCandidates.push(c)
      }
    }

    const ranked = rankRetrievalCandidates(uniqueCandidates, limit)

    const subSources: SubSourceDurations = {
      questionBankMs: qbDuration,
      quizMs: quizDuration,
      questionBankStatus: qbStatus,
      quizStatus,
      partialFailure: hasPartialFailure,
    }

    return {
      evidences: ranked,
      subSources,
    }
  }

  private async queryQuestionBank(input: RetrievalInput, timeoutMs: number): Promise<RetrievalResult[]> {
    const { categoryId, currentQuestionText, targetOptionText, courseCode } = input
    if (!categoryId) return []

    const queryPromise = (async () => {
      const bankDocs = await QuestionBank.find({ category_id: categoryId })
        .select('text options correct_answer explanation')
        .limit(50)
        .lean()

      const list: RetrievalResult[] = []

      for (const q of bankDocs) {
        if (!q.text || q.text.trim() === currentQuestionText.trim()) continue

        const breakdown = calculateRelevanceBreakdown({
          candidate: {
            text: q.text,
            options: q.options,
            correctAnswer: q.correct_answer,
            metadata: { categoryId, courseCode },
          },
          currentQuestionText,
          targetOptionText,
          categoryId,
          courseCode,
        })

        list.push({
          id: `qb-${q._id.toString()}`,
          sourceType: 'question_bank',
          sourceId: q._id.toString(),
          content: q.text,
          options: q.options,
          correctAnswer: q.correct_answer,
          explanation: q.explanation,
          score: breakdown.totalScore,
          matchedAnswerText: breakdown.matchedAnswerText,
          breakdown: {
            optionScore: breakdown.optionScore,
            questionScore: breakdown.questionScore,
            subjectScore: breakdown.subjectScore,
          },
          metadata: { categoryId, courseCode },
        })
      }

      return list
    })()

    return this.withTimeout(queryPromise, timeoutMs, 'QuestionBank')
  }

  private async queryCourseQuizzes(input: RetrievalInput, timeoutMs: number): Promise<RetrievalResult[]> {
    const { courseCode, currentQuestionText, targetOptionText, categoryId } = input
    if (!courseCode) return []

    const queryPromise = (async () => {
      // Prioritize authoritative category_id (indexed equality); fallback to exact course_code
      const queryFilter = categoryId
        ? { category_id: categoryId }
        : { course_code: courseCode }

      const findRes = Quiz.find(queryFilter) as any

      const courseQuizzes = findRes && typeof findRes.select === 'function'
        ? await findRes.select('questions course_code category_id').limit(10).lean()
        : []

      const list: RetrievalResult[] = []

      for (const qz of courseQuizzes) {
        if (!Array.isArray(qz.questions)) continue
        for (const q of qz.questions) {
          if (!q.text || q.text.trim() === currentQuestionText.trim()) continue

          const breakdown = calculateRelevanceBreakdown({
            candidate: {
              text: q.text,
              options: q.options,
              correctAnswer: q.correct_answer,
              metadata: { categoryId: qz.category_id?.toString() || categoryId, courseCode: qz.course_code || courseCode },
            },
            currentQuestionText,
            targetOptionText,
            categoryId,
            courseCode,
          })

          list.push({
            id: `qz-${q._id?.toString() || q.text.slice(0, 16)}`,
            sourceType: 'quiz',
            sourceId: q._id?.toString() || qz._id?.toString() || 'quiz-q',
            content: q.text,
            options: q.options,
            correctAnswer: q.correct_answer,
            explanation: q.explanation,
            score: breakdown.totalScore,
            matchedAnswerText: breakdown.matchedAnswerText,
            breakdown: {
              optionScore: breakdown.optionScore,
              questionScore: breakdown.questionScore,
              subjectScore: breakdown.subjectScore,
            },
            metadata: {
              courseCode: qz.course_code || courseCode,
              categoryId: qz.category_id?.toString() || categoryId,
              quizId: qz._id?.toString(),
            },
          })
        }
      }

      return list
    })()

    return this.withTimeout(queryPromise, timeoutMs, 'Quiz')
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, sourceName: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`[MongoQuestionRetriever] Timeout ${ms}ms exceeded for source ${sourceName}`))
      }, ms)

      promise
        .then((res) => {
          clearTimeout(timer)
          resolve(res)
        })
        .catch((err) => {
          clearTimeout(timer)
          reject(err)
        })
    })
  }
}
