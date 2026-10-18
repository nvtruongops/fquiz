'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useSessionLoader } from '@/components/quiz/shared/QuizLoader'
import { promptSessionReauth } from '@/store/shared/auth-prompt-store'

interface UseSessionFinalizeParams {
  sessionId: string
  quizId: string
  canFinalize?: () => boolean
}

interface UseSessionFinalizeResult {
  finalizeMutation: ReturnType<typeof useMutation<{ completed: boolean; score: number; totalQuestions: number }, Error, void, { sessionId: string; quizId: string }>>
  isFinalizing: boolean
}

export function useSessionFinalize({
  sessionId,
  quizId,
  canFinalize = () => true,
}: UseSessionFinalizeParams): UseSessionFinalizeResult {
  const router = useRouter()
  const queryClient = useQueryClient()
  const sessionLoader = useSessionLoader()
  const permissionRef = useRef({ sessionId, canFinalize })
  permissionRef.current = { sessionId, canFinalize }

  const finalizeMutation = useMutation<{ completed: boolean; score: number; totalQuestions: number }, Error, void, { sessionId: string; quizId: string }>({
    mutationKey: ['sessions', sessionId, 'finalize'],
    onMutate: () => ({ sessionId, quizId }),
    mutationFn: async () => {
      if (permissionRef.current.sessionId !== sessionId || !permissionRef.current.canFinalize()) throw new Error('Save all answers in the active tab before submitting.')
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

      if (permissionRef.current.sessionId === sessionId) sessionLoader.advance(95, 'Preparing result summary...')
      return res.json()
    },
    onSuccess: async (_data, _variables, request) => {
      if (!request || permissionRef.current.sessionId !== request.sessionId) return
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['student', 'dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['history'] }),
      ])
      sessionLoader.completeAndNavigate(() => {
        router.push(`/quiz/${request.quizId}/result/${request.sessionId}`)
      })
    },
    onError: (_error, _variables, request) => {
      if (request && permissionRef.current.sessionId !== request.sessionId) return
      sessionLoader.close()
    },
  })

  return { finalizeMutation, isFinalizing: finalizeMutation.isPending }
}
