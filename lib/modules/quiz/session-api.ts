import { SessionData, PreloadedQuestions } from '@/lib/modules/quiz/types/session'

export type SessionApiError = Error & {
  status?: number
  code?: string
}

export async function fetchSession(sessionId: string): Promise<SessionData> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}`)
  if (!res.ok) {
    if (res.status === 401) {
      const currentUrl = window.location.pathname + window.location.search
      window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}&reason=session_expired`
      throw new Error('Session expired. Redirecting to login...')
    }
    const err = await res.json().catch(() => ({})) as { error?: string; code?: string }
    const apiError = new Error(err.error ?? 'Failed to load session') as SessionApiError
    apiError.status = res.status
    apiError.code = err.code
    throw apiError
  }
  return res.json()
}

export async function fetchAllQuestions(sessionId: string): Promise<PreloadedQuestions> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}/questions`)
  if (!res.ok) {
    if (res.status === 401) {
      const currentUrl = window.location.pathname + window.location.search
      window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}&reason=session_expired`
      throw new Error('Session expired. Redirecting to login...')
    }
    const err = await res.json().catch(() => ({})) as { error?: string; code?: string }
    const apiError = new Error(err.error ?? 'Failed to load questions') as SessionApiError
    apiError.status = res.status
    apiError.code = err.code
    throw apiError
  }
  return res.json()
}
