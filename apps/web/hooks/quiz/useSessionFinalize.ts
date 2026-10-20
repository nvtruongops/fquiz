'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { promptSessionReauth } from '@/store/shared/auth-prompt-store'

const submissionTimeoutMs = 30_000

async function submitSession(sessionId: string) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), submissionTimeoutMs)
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}/submit`,
      { method: 'POST', headers: withCsrfHeaders(), signal: controller.signal },
    )
    if (!res.ok) {
      if (res.status === 401) {
        promptSessionReauth()
        throw new Error('Session expired. Sign in again in the new tab, then submit again.')
      }
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? 'Failed to submit quiz')
    }
    return await res.json()
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Submission timed out. Please try again.')
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

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
  const permissionRef = useRef({ sessionId, canFinalize })
  permissionRef.current = { sessionId, canFinalize }

  const finalizeMutation = useMutation<{ completed: boolean; score: number; totalQuestions: number }, Error, void, { sessionId: string; quizId: string }>({
    mutationKey: ['sessions', sessionId, 'finalize'],
    onMutate: () => ({ sessionId, quizId }),
    mutationFn: async () => {
      if (permissionRef.current.sessionId !== sessionId || !permissionRef.current.canFinalize()) throw new Error('Save all answers in the active tab before submitting.')
      return submitSession(sessionId)
    },
    onSuccess: (_data, _variables, request) => {
      if (!request || permissionRef.current.sessionId !== request.sessionId) return
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['student', 'dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['history'] }),
      ])
      router.push(`/quiz/${request.quizId}/result/${request.sessionId}`)
    },
  })

  return { finalizeMutation, isFinalizing: finalizeMutation.isPending }
}
