import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { Question } from '@/lib/modules/quiz/models/Question'
import { getPublicQuizFilter } from '@/lib/modules/quiz/utils/public-quiz-filter'
import { generateQuestionId, normalizeQuestionUsageCodes } from '@fquiz/models'

export interface QuestionUsageResult { count: number; quizzes: string[] }
export interface QuestionUsageQueryItem { question_id?: string; question_id_aliases?: string[]; text?: string; options?: string[] }
export type QuestionUsageQuery = string | QuestionUsageQueryItem

function contentId(item: QuestionUsageQueryItem) {
  return item.text && item.options?.length ? generateQuestionId({ text: item.text, options: item.options }) : ''
}
function queryKeys(item: QuestionUsageQuery) {
  return typeof item === 'string'
    ? { id: item.trim(), text: '', content: '' }
    : { id: item?.question_id?.trim() || '', text: item?.text?.trim() || '', content: contentId(item) }
}
function matchesQuery(question: QuestionUsageQueryItem, query: ReturnType<typeof queryKeys>) {
  if (query.content) return contentId(question) === query.content
  if (!query.id) return question.text?.trim() === query.text
  return question.question_id === query.id || Boolean(question.question_id_aliases?.includes(query.id))
}

function normalizeCourseCode(code: unknown): string | null {
  return normalizeQuestionUsageCodes([code])[0] ?? null
}

/** Counts actual visible quiz references. Bank counters are not authority. */
export class QuestionUsageService {
  static async getQuestionPublicUsage(query: QuestionUsageQuery, currentCourseCode?: string): Promise<QuestionUsageResult> {
    const results = await this.getBatchQuestionPublicUsage([query], currentCourseCode)
    const { id, text } = queryKeys(query)
    return results.get(id || text) ?? { count: 0, quizzes: [] }
  }

  static async getBatchQuestionPublicUsage(items: QuestionUsageQuery[], _currentCourseCode?: string): Promise<Map<string, QuestionUsageResult>> {
    const results = new Map<string, QuestionUsageResult>()
    const queries = items.map(queryKeys).filter(q => q.id || q.text)
    if (queries.length === 0) return results
    const ids = [...new Set(queries.flatMap(q => [q.id, q.content]).filter(Boolean))]
    const texts = [...new Set(queries.filter(q => !q.id).map(q => q.text).filter(Boolean))]
    const predicates: Record<string, unknown>[] = []
    if (ids.length) predicates.push({ 'questions.question_id': { $in: ids } })
    if (ids.length) predicates.push({ 'questions.question_id_aliases': { $in: ids } })
    if (texts.length) predicates.push({ 'questions.text': { $in: texts } })
    const referencePredicates: Record<string, unknown>[] = []
    if (ids.length) referencePredicates.push({ question_id: { $in: ids } })
    if (ids.length) referencePredicates.push({ question_id_aliases: { $in: ids } })
    if (texts.length) referencePredicates.push({ text: { $in: texts } })
    const references = await Question.find({ $or: referencePredicates }).select('_id question_id question_id_aliases text options').lean()
    if (references.length) predicates.push({ question_refs: { $in: references.map(q => q._id) } })
    const byId = new Map(references.map(q => [String(q._id), q]))
    // Query authoritative references: a process-local cache stays stale after another worker edits a quiz.
    const quizzes = await Quiz.find({ ...getPublicQuizFilter(), $or: predicates })
      .select('course_code question_refs questions.question_id questions.question_id_aliases questions.text questions.options').lean()
    for (const query of queries) {
      const codes = new Set<string>()
      for (const quiz of quizzes) {
        const code = normalizeCourseCode(quiz.course_code)
        const candidates = quiz.questions?.length ? quiz.questions : (quiz.question_refs ?? []).map((ref: unknown) => byId.get(String(ref))).filter(Boolean)
        const matches = candidates.some((q: QuestionUsageQueryItem) => matchesQuery(q, query))
        if (code && matches) codes.add(code)
      }
      const value = { count: codes.size, quizzes: [...codes].sort() }
      if (query.id) results.set(query.id, value)
      if (query.text) results.set(query.text, value)
    }
    return results
  }
}
