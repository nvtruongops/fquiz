import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/useToast'

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

export interface Category {
  _id: string
  name: string
}

async function fetchQuizzes(
  page: number,
  categoryId: string,
  search: string
): Promise<{ quizzes: Quiz[]; total: number }> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', '10')
  if (categoryId && categoryId !== 'all') params.set('category_id', categoryId)
  if (search.trim()) params.set('search', search.trim())

  const res = await fetch(`/api/quizzes?${params.toString()}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Không thể tải danh sách đề thi')
  return res.json()
}

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/categories', { credentials: 'include' })
  if (!res.ok) throw new Error('Không thể tải danh mục')
  const data = await res.json()
  return data.categories || []
}

export function useAdminQuizzes() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<Quiz | null>(null)

  const { data: categories = [] } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: fetchCategories,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'quizzes', page, category, search],
    queryFn: () => fetchQuizzes(page, category, search),
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/quizzes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Cập nhật trạng thái thất bại')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'quizzes'] })
      toast({ title: 'Thành công', description: 'Đã cập nhật trạng thái quiz', type: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: 'Lỗi', description: err.message, type: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/quizzes/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Xóa đề thi thất bại')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'quizzes'] })
      setDeleteTarget(null)
      toast({ title: 'Thành công', description: 'Đã xóa đề thi', type: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: 'Lỗi', description: err.message, type: 'error' })
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
    totalPages,
    updateStatusMutation,
    deleteMutation,
  }
}
