import { SessionData, PreloadedQuestions } from '@/lib/modules/quiz/types/session'

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
    const currentUrl = window.location.pathname + window.location.search
    window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}&reason=session_expired`
    throw new Error('Session expired. Redirecting to login...')
  }
  if (res.status === 410) {
    const match = window.location.pathname.match(/\/quiz\/([^/]+)/)
    const quizId = match ? match[1] : ''
    const target = quizId ? `/quiz/${quizId}?reason=idle_timeout` : '/dashboard?reason=idle_timeout'
    window.location.href = target
    throw new Error('Phiên làm bài đã tự động kết thúc do tạm dừng quá 5 phút.')
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
