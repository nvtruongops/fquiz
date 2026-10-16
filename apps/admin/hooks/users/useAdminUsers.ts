import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/useToast'

export interface User {
  _id: string
  username: string
  email: string
  role: 'admin' | 'teacher' | 'student' | 'dev'
  status: 'active' | 'banned'
  created_at: string
}

export interface UsersResponse {
  users: User[]
  total: number
  page: number
  totalPages: number
}

async function fetchUsers(
  page: number,
  search: string,
  role: string,
  status: string
): Promise<UsersResponse> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', '10')
  if (search.trim()) params.set('search', search.trim())
  if (role) params.set('role', role)
  if (status) params.set('status', status)

  const res = await fetch(`/api/users?${params.toString()}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load user list')
  return res.json()
}

export function useAdminUsers() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search, role, status],
    queryFn: () => fetchUsers(page, search, role, status),
    staleTime: 30 * 1000,
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update user')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast({ title: 'Success', description: 'User account updated successfully', type: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, type: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete user account')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast({ title: 'Success', description: 'User account deleted successfully', type: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, type: 'error' })
    },
  })

  return {
    page,
    setPage,
    search,
    setSearch,
    role,
    setRole,
    status,
    setStatus,
    data,
    isLoading,
    updateMutation,
    deleteMutation,
  }
}
