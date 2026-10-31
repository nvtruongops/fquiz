import type { QueryClient } from '@tanstack/react-query'

export function getSessionPreloadStorageKey(
  kind: 'initial' | 'questions',
  sessionId: string,
  ownerId?: string,
): string | null {
  if (!ownerId) return null
  const prefix = kind === 'initial' ? 'session_initial_preload' : 'session_preload'
  return `${prefix}_${ownerId}_${sessionId}`
}

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
  clearSessionPreloadCache()
}

export function clearSessionPreloadCache(): void {
  try {
    const storage = globalThis.sessionStorage
    for (let index = storage.length - 1; index >= 0; index--) {
      const key = storage.key(index)
      if (key?.startsWith('session_initial_preload_') || key?.startsWith('session_preload_')) {
        storage.removeItem(key)
      }
    }
  } catch {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
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
