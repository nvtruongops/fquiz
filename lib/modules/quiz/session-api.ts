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
  if (res.status === 404) {
    const match = typeof window !== 'undefined' ? window.location.pathname.match(/\/quiz\/([^/]+)/) : null
    const quizId = match ? match[1] : ''
    const target = quizId ? `/quiz/${quizId}?reason=session_not_found` : '/my-quizzes?reason=session_not_found'
    if (typeof window !== 'undefined') {
      window.location.href = target
    }
    const apiError = new Error('Phiên làm bài không tồn tại hoặc đã bị xóa.') as SessionApiError
    apiError.status = 404
    throw apiError
  }
  if (res.status === 410) {
    const match = typeof window !== 'undefined' ? window.location.pathname.match(/\/quiz\/([^/]+)/) : null
    const quizId = match ? match[1] : ''
    const target = quizId ? `/quiz/${quizId}?reason=idle_timeout` : '/dashboard?reason=idle_timeout'
    if (typeof window !== 'undefined') {
      window.location.href = target
    }
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
