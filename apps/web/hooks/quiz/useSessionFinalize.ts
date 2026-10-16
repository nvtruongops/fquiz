'use client'

import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useSessionLoader } from '@/components/quiz/shared/QuizLoader'
import { promptSessionReauth } from '@/store/shared/auth-prompt-store'

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
      sessionLoader.open('Submitting exam and scoring...')
      sessionLoader.advance(50, 'Analyzing results...')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}/submit`,
        { method: 'POST', headers: withCsrfHeaders() },
      )
      if (!res.ok) {
        if (res.status === 401) {
          promptSessionReauth()
          throw new Error('Session expired. Sign in again in the new tab, then submit again.')
        }
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to submit quiz')
      }

      sessionLoader.advance(95, 'Preparing result summary...')
      return res.json()
    },
    onSuccess: () => {
      sessionLoader.completeAndNavigate(() => {
        router.push(`/quiz/${quizId}/result/${sessionId}`)
      })
    },
    onError: () => {
      sessionLoader.close()
    },
  })

  return { finalizeMutation, isFinalizing: finalizeMutation.isPending }
}
