import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/useToast'

export interface Category {
  _id: string
  name: string
  quiz_count?: number
  created_at?: string
}

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/categories', { credentials: 'include' })
  if (!res.ok) throw new Error('Không thể tải danh sách danh mục')
  const data = await res.json()
  return data.categories || []
}

export function useAdminCategories() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: fetchCategories,
  })

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Tạo danh mục thất bại')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      setNewName('')
      toast({ title: 'Thành công', description: 'Đã tạo danh mục mới', type: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: 'Lỗi', description: err.message, type: 'error' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Cập nhật danh mục thất bại')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      setEditId(null)
      toast({ title: 'Thành công', description: 'Đã cập nhật danh mục', type: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: 'Lỗi', description: err.message, type: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Xóa danh mục thất bại')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      setDeleteTarget(null)
      toast({ title: 'Thành công', description: 'Đã xóa danh mục', type: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: 'Lỗi', description: err.message, type: 'error' })
    },
  })

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase().trim())
  )

  return {
    search,
    setSearch,
    newName,
    setNewName,
    editId,
    setEditId,
    editName,
    setEditName,
    deleteTarget,
    setDeleteTarget,
    filteredCategories,
    isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
  }
}
