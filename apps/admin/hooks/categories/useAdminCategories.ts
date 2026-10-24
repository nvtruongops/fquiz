import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/useToast'
import { withCsrfHeaders } from '@/lib/security/csrf'

export interface Category {
  _id: string
  name: string
  quiz_count?: number
  created_at?: string
}

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/categories', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load categories')
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
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create category')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      setNewName('')
      toast({ title: 'Success', description: 'Category created successfully', type: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, type: 'error' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update category')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      setEditId(null)
      toast({ title: 'Success', description: 'Category updated successfully', type: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, type: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE', headers: withCsrfHeaders() })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete category')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      setDeleteTarget(null)
      toast({ title: 'Success', description: 'Category deleted successfully', type: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, type: 'error' })
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
