import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/useToast'
import { withCsrfHeaders } from '@/lib/security/csrf'

export interface Quiz {
  _id: string
  title: string
  category_id: { _id: string; name: string } | string
  course_code: string
  questionCount?: number
  studentCount: number
  created_at: string
  status: 'published' | 'draft' | 'archived'
}

interface Category {
  _id: string
  name: string
}

async function fetchQuizzes(
  page: number,
  categoryId: string,
  search: string,
  signal: AbortSignal
): Promise<{ quizzes: Quiz[]; total: number }> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', '10')
  if (categoryId && categoryId !== 'all') params.set('category_id', categoryId)
  if (search.trim()) params.set('search', search.trim())

  const res = await fetch(`/api/quizzes?${params.toString()}`, { credentials: 'include', signal })
  if (!res.ok) throw new Error('Failed to load quiz list')
  return res.json()
}

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/categories', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load categories')
  const data = await res.json()
  return data.categories || []
}

export function useAdminQuizzes() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<Quiz | null>(null)
  const normalizedSearch = search.trim()
  const isSearchPending = normalizedSearch !== debouncedSearch

  useEffect(() => {
    if (!isSearchPending) return
    const timer = setTimeout(() => {
      setDebouncedSearch(normalizedSearch)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [isSearchPending, normalizedSearch])

  const { data: categories = [] } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'quizzes', page, category, debouncedSearch],
    queryFn: ({ signal }) => fetchQuizzes(page, category, debouncedSearch, signal),
    enabled: !isSearchPending,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/quizzes/${id}`, {
        method: 'PUT',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'quizzes'] })
      toast({ title: 'Success', description: 'Quiz status updated successfully', type: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, type: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/quizzes/${id}`, { method: 'DELETE', headers: withCsrfHeaders() })
      if (!res.ok) throw new Error('Failed to delete quiz')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'quizzes'] })
      setDeleteTarget(null)
      toast({ title: 'Success', description: 'Quiz deleted successfully', type: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, type: 'error' })
    },
  })

  const totalPages = data ? Math.ceil(data.total / 10) : 1

  return {
    page,
    setPage,
    search,
    setSearch,
    category,
    setCategory,
    deleteTarget,
    setDeleteTarget,
    categories,
    data,
    isLoading,
    isFetching,
    isSearchPending,
    totalPages,
    updateStatusMutation,
    deleteMutation,
  }
}
