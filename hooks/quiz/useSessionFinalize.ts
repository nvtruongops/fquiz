'use client'

import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useSessionLoader } from '@/components/quiz/shared/QuizLoader'

interface UseSessionFinalizeParams {
  sessionId: string
  quizId: string
}

interface UseSessionFinalizeResult {
  finalizeMutation: ReturnType<typeof useMutation<{ completed: boolean; score: number; totalQuestions: number }, Error>>
  isFinalizing: boolean
}

export function useSessionFinalize({
  sessionId,
  quizId,
}: UseSessionFinalizeParams): UseSessionFinalizeResult {
  const router = useRouter()
  const sessionLoader = useSessionLoader()

  const finalizeMutation = useMutation<{ completed: boolean; score: number; totalQuestions: number }, Error>({
    mutationFn: async () => {
      sessionLoader.open('Đang nộp bài và chấm điểm...')
      sessionLoader.advance(50, 'Đang phân tích kết quả...')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}/submit`,
        { method: 'POST', headers: withCsrfHeaders() },
      )
      if (!res.ok) {
        if (res.status === 401) {
          const currentUrl = window.location.pathname + window.location.search
          window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}&reason=session_expired`
          throw new Error('Session expired. Redirecting to login...')
        }
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Không thể nộp bài')
      }

      sessionLoader.advance(95, 'Đang chuẩn bị bảng kết quả...')
      return res.json()
    },
    onSuccess: () => {
      sessionLoader.complete()
      setTimeout(() => router.push(`/quiz/${quizId}/result/${sessionId}`), 300)
    },
    onError: () => {
      sessionLoader.close()
    },
  })

  return { finalizeMutation, isFinalizing: finalizeMutation.isPending }
}
