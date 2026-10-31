import { resolveQuestionBankUsageCodes } from './question-bank-reconciliation'

function parsePositiveInteger(value: string | null, fallback: number, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isNaN(parsed) || parsed < 1 ? fallback : Math.min(parsed, maximum)
}

function parseCategoryId(value: string | null) {
  if (!value?.trim() || value === 'all') return { category_id: undefined, invalidCategory: false }
  if (/^[a-f0-9]{24}$/i.test(value)) return { category_id: value, invalidCategory: false }
  return { category_id: undefined, invalidCategory: true }
}

export function parseQuestionBankAnalyticsParams(searchParams: URLSearchParams) {
  return {
    ...parseCategoryId(searchParams.get('category_id')),
    page: parsePositiveInteger(searchParams.get('page'), 1),
    per_page: parsePositiveInteger(searchParams.get('per_page'), 100, 200),
    search: searchParams.get('search')?.trim() || undefined,
  }
}

export async function resolveQuestionBankQuestions<TQuestion extends { used_in_quiz_ids?: Iterable<unknown>; used_in_quizzes?: Iterable<unknown> }>(
  questions: TQuestion[],
  quizModel: { find(filter: { _id: { $in: unknown[] } }): { select(fields: string): { lean(): Promise<Array<{ _id: unknown; course_code: unknown }>> } } },
) {
  const quizIds = [...new Set(questions.flatMap(question => [...(question.used_in_quiz_ids ?? [])]))]
  const quizzes = quizIds.length
    ? await quizModel.find({ _id: { $in: quizIds } }).select('course_code').lean()
    : []
  const quizMap = new Map(quizzes.map(quiz => [String(quiz._id), quiz.course_code]))
  return questions.map(question => {
    const used_in_quizzes = resolveQuestionBankUsageCodes(question, quizMap)
    return { ...question, used_in_quizzes, usage_count: used_in_quizzes.length }
  })
}
