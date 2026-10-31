/** Map display indices against the effective snapshot deck, never the current quiz ordering. */
function answerKey(value: unknown): number[] {
  if (Array.isArray(value)) return value
  return typeof value === 'number' ? [value] : []
}

function revealQuestion(session: any, submitted: unknown) {
  return session.status === 'completed' || session.mode === 'flashcard' || (session.mode === 'immediate' && Boolean(submitted))
}

function formatQuestion(session: any, question: any, displayIndex: number) {
    const submitted = session.user_answers?.find((answer: any) => answer.question_index === displayIndex)
    const revealed = revealQuestion(session, submitted)
    const selected = submitted ? answerKey(submitted.answer_indexes ?? submitted.answer_index) : null
    return {
      _id: question?._id?.toString() ?? `unavailable-${displayIndex}`,
      text: question?.text ?? 'Question unavailable',
      options: question?.options ?? [],
      correct_answer: revealed ? answerKey(question?.correct_answer) : undefined,
      explanation: revealed ? question?.explanation ?? null : undefined,
      ...(question?.image_url ? { image_url: question.image_url } : {}),
      submitted_answer: selected,
      is_correct: revealed ? submitted?.is_correct ?? false : false,
      ...(!question ? { snapshot_unavailable: true } : {}),
    }
}

export function formatSessionResultQuestions(session: any, questions: any[], questionOrder: number[]) {
  return questionOrder.map((sourceIndex, displayIndex) => formatQuestion(session, questions.at(sourceIndex), displayIndex))
}

/**
 * Legacy completed sessions may not have a cached question snapshot. Keep the
 * number of displayed placeholders tied to what the session persisted, never
 * to a quiz that may since have been deleted or edited.
 */
function isValidPersistedQuestionOrder(order: unknown[]): boolean {
  return order.every((index) => Number.isInteger(index) && (index as number) >= 0) &&
    new Set(order).size === order.length
}

function getLastAnsweredQuestionIndex(session: any): number {
  return (session?.user_answers ?? [])
    .map((answer: any) => answer?.question_index)
    .filter((index: unknown) => Number.isInteger(index) && (index as number) >= 0)
    .reduce((highest: number, index: number) => Math.max(highest, index), -1)
}

function getPersistedQuestionCount(session: any): number {
  const flashcardCount = Number(session?.flashcard_stats?.total_cards) || 0
  return Math.max(flashcardCount, getLastAnsweredQuestionIndex(session) + 1)
}

function sequentialQuestionOrder(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index)
}

export function historicalResultQuestionOrder(session: any, resolvedOrder: number[]): number[] {
  const persistedOrder = session?.question_order
  if (Array.isArray(persistedOrder) && persistedOrder.length > 0) {
    return isValidPersistedQuestionOrder(persistedOrder)
      ? persistedOrder
      : sequentialQuestionOrder(persistedOrder.length)
  }

  const persistedCount = getPersistedQuestionCount(session)
  return persistedCount > 0 ? sequentialQuestionOrder(persistedCount) : resolvedOrder
}

export function historicalResultEvidence(session: any, source: any) {
  const cached = Array.isArray(session.questions_cache) && session.questions_cache.length > 0
  const edited = Boolean(source?.updatedAt && session.started_at && new Date(source.updatedAt).getTime() > new Date(session.started_at).getTime())
  return { quiz_updated_after_start: edited, snapshot_unavailable: !cached && (!source || edited), snapshot_source: cached ? 'session-cache' : 'legacy-source' }
}

export function publicSessionAnswers(session: any) {
  if (session.status === 'completed' || session.mode !== 'review') return session.user_answers ?? []
  return (session.user_answers ?? []).map(({ is_correct: _private, ...answer }: any) => answer)
}
