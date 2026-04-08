import type { QueryClient } from '@tanstack/react-query'

/**
 * Invalidate history cache for sessions related to a specific quiz.
 * Call when Admin updates a quiz.
 */
export async function invalidateHistoryForQuiz(
  queryClient: QueryClient,
  quizId: string
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: ['history'],
    predicate: (query) => {
      const data = query.state.data as any
      return data?.session?.quiz_id === quizId
    },
  })
}

/**
 * Clear all user cache. Call on logout or account deletion.
 */
export function clearAllUserCache(queryClient: QueryClient): void {
  queryClient.clear()
}

/**
 * Invalidate history cache when Admin deletes a quiz.
 * All history queries are invalidated so deleted-quiz fallback UI can render.
 */
export async function invalidateHistoryForDeletedQuiz(
  queryClient: QueryClient,
  quizId: string
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ['history'] })
}
