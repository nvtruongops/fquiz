import { SessionData, PreloadedQuestions } from '@/lib/modules/quiz/types/session'
import { promptSessionReauth } from '@/store/shared/auth-prompt-store'

export type SessionApiError = Error & {
  status?: number
  code?: string
}

const DEFAULT_TIMEOUT_MS = 10000

async function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function handleSessionResponse(res: Response, context: 'session' | 'questions'): Promise<never> {
  if (res.status === 401) {
    promptSessionReauth()
    const apiError = new Error('Session expired. Please sign in again.') as SessionApiError
    apiError.status = res.status
    throw apiError
  }
  if (res.status === 404) {
    const apiError = new Error('Quiz session does not exist or has been removed.') as SessionApiError
    apiError.status = 404
    throw apiError
  }
  if (res.status === 410) {
    const apiError = new Error('Quiz session ended automatically due to being paused for over 5 minutes.') as SessionApiError
    apiError.status = 410
    throw apiError
  }
  const err = await res.json().catch(() => ({})) as { error?: string; code?: string }
  const defaultMsg = context === 'session' ? 'Failed to load session' : 'Failed to load questions'
  const apiError = new Error(err.error ?? defaultMsg) as SessionApiError
  apiError.status = res.status
  apiError.code = err.code
  throw apiError
}

export async function fetchSession(sessionId: string): Promise<SessionData> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''
  const res = await fetchWithTimeout(`${baseUrl}/api/sessions/${sessionId}`)
  if (!res.ok) {
    await handleSessionResponse(res, 'session')
  }
  return res.json()
}

export async function fetchAllQuestions(sessionId: string): Promise<PreloadedQuestions> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''
  const res = await fetchWithTimeout(`${baseUrl}/api/sessions/${sessionId}/questions`)
  if (!res.ok) {
    await handleSessionResponse(res, 'questions')
  }
  return res.json()
}
