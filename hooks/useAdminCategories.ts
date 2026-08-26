'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/store/shared/toast-store'
import { normalizeSearchInput, sanitizeQueryParams } from '@/lib/core/validation/client-validation'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

export interface Category {
  _id: string
  name: string
  quizCount: number
  questionBankCount?: number
  created_at: string
  status: 'pending' | 'approved' | 'rejected'
  type: 'private' | 'public'
}

async function fetchCategories(search = '', status = 'approved'): Promise<{ categories: Category[] }> {
  const normalizedSearch = normalizeSearchInput(search, 200)
  const validStatus = ['pending', 'approved', 'rejected', ''].includes(status) ? status : 'approved'

  const queryParams = sanitizeQueryParams({
    ...(normalizedSearch ? { search: normalizedSearch } : {}),
    ...(validStatus ? { status: validStatus } : {}),
    type: 'public',
  })

  const params = new URLSearchParams(queryParams)
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/categories?${params.toString()}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

async function createCategory(name: string): Promise<{ category: Category }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/categories`, {
    method: 'POST',
    credentials: 'include',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? 'Failed to create category')
  }
  return res.json()
}

async function updateCategory(id: string, name: string): Promise<{ category: Category }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/categories/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? 'Failed to update category')
  }
  return res.json()
}

async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/categories/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: withCsrfHeaders(),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? 'Failed to delete category')
  }
}

export function useAdminCategories() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [search, setSearch] = useState('')

  const { data: categoryData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['admin', 'categories', search],
    queryFn: () => fetchCategories(search, 'approved'),
  })

  const publicCategories = (categoryData?.categories ?? []).filter((cat) => cat.type === 'public')

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      setNewName('')
      toast.success('Đã thêm danh mục mới')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateCategory(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      setEditId(null)
      setEditName('')
      toast.success('Đã cập nhật danh mục')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      setDeleteTarget(null)
      toast.success('Đã xóa danh mục')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return {
    newName, setNewName,
    editId, setEditId,
    editName, setEditName,
    deleteTarget, setDeleteTarget,
    search, setSearch,
    isCategoriesLoading, publicCategories,
    createMutation, updateMutation, deleteMutation,
  }
}
