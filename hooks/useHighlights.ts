'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { IUserHighlight } from '@/types/highlight'

export function useHighlights(questionId: string) {
  return useQuery<IUserHighlight[]>({
    queryKey: ['highlights', questionId],
    staleTime: 0,
    enabled: !!questionId,
    queryFn: async () => {
      const res = await fetch(`/api/highlights?question_id=${questionId}`)
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to fetch highlights' }))
        throw new Error(error.message || 'Failed to fetch highlights')
      }
      const data = await res.json()
      return data.highlights as IUserHighlight[]
    },
  })
}

interface AddHighlightVariables {
  question_id: string
  text_segment: string
  offset: number
  color_code: '#B0D4B8' | '#D7F9FA' | '#FFE082' | '#EF9A9A'
}

export function useAddHighlight(questionId: string) {
  const queryClient = useQueryClient()

  return useMutation<IUserHighlight, Error, AddHighlightVariables, { previousHighlights: IUserHighlight[] | undefined }>({
    mutationFn: async (variables) => {
      const res = await fetch('/api/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to add highlight' }))
        throw new Error(error.message || 'Failed to add highlight')
      }
      return res.json()
    },

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['highlights', questionId] })

      const previousHighlights = queryClient.getQueryData<IUserHighlight[]>(['highlights', questionId])

      const optimisticHighlight = {
        ...variables,
        _id: 'temp-' + Date.now(),
        student_id: 'temp',
        created_at: new Date(),
      } as unknown as IUserHighlight

      queryClient.setQueryData<IUserHighlight[]>(['highlights', questionId], (old) => [
        ...(old ?? []),
        optimisticHighlight,
      ])

      return { previousHighlights }
    },

    onError: (_error, _variables, context) => {
      if (context?.previousHighlights !== undefined) {
        queryClient.setQueryData(['highlights', questionId], context.previousHighlights)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights', questionId] })
    },
  })
}

export function useRemoveHighlight(questionId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: async (highlightId) => {
      const res = await fetch(`/api/highlights/${highlightId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to remove highlight' }))
        throw new Error(error.message || 'Failed to remove highlight')
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights', questionId] })
    },
  })
}

export function useInvalidateHighlights() {
  const queryClient = useQueryClient()
  return (questionId: string) =>
    queryClient.invalidateQueries({ queryKey: ['highlights', questionId] })
}
