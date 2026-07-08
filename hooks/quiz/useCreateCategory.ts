'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useToast } from '@/store/shared/toast-store'

interface UseCreateCategoryOptions {
  onSuccess?: (data: { category: { _id: string; name: string } }) => void
  onError?: (error: Error) => void
}

export function useCreateCategory(options: UseCreateCategoryOptions = {}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/categories`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error || 'Không thể tạo danh mục')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student', 'categories'] })
      toast.success('Đã tạo môn học mới')
      options.onSuccess?.(data)
    },
    onError: (err: Error) => {
      toast.error(err.message)
      options.onError?.(err)
    },
  })
}