import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/useToast'
import { withCsrfHeaders } from '@/lib/security/csrf'

export interface Feedback {
  _id: string
  username: string
  user_email: string
  type: 'bug' | 'feature' | 'content' | 'other'
  message: string
  status: 'pending' | 'reviewed' | 'resolved'
  reply_message?: string
  replied_at?: string
  created_at: string
}

export const TYPE_LABELS: Record<string, string> = {
  bug: 'Bug report',
  feature: 'Feature request',
  content: 'Content feedback',
  other: 'Other',
}

export const TYPE_COLORS: Record<string, string> = {
  bug: 'border-destructive/30 bg-destructive/10 text-destructive',
  feature: 'border-info-border bg-info-bg text-info-fg',
  content: 'border-primary/20 bg-primary/10 text-primary',
  other: 'border-border bg-muted text-muted-foreground',
}

async function fetchFeedbacks(
  type: string,
  status: string,
  search: string
): Promise<Feedback[]> {
  const params = new URLSearchParams()
  if (type && type !== 'all') params.set('type', type)
  if (status && status !== 'all') params.set('status', status)
  if (search.trim()) params.set('search', search.trim())

  const res = await fetch(`/api/feedback?${params.toString()}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load feedback list')
  const data = await res.json()
  return data.feedbacks || []
}

export function useAdminFeedback() {
  const queryClient = useQueryClient()
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [replyTarget, setReplyTarget] = useState<Feedback | null>(null)
  const [replyText, setReplyText] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Feedback | null>(null)

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['admin', 'feedback', type, status, search],
    queryFn: () => fetchFeedbacks(type, status, search),
    staleTime: 30 * 1000,
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'PUT',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] })
      toast({ title: 'Success', description: 'Feedback status updated successfully', type: 'success' })
    },
  })

  const replyMutation = useMutation({
    mutationFn: async ({ id, reply_message }: { id: string; reply_message: string }) => {
      const res = await fetch(`/api/feedback/${id}/reply`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ reply_message }),
      })
      if (!res.ok) throw new Error('Failed to send reply')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] })
      setReplyTarget(null)
      setReplyText('')
      toast({ title: 'Success', description: 'Reply sent successfully', type: 'success' })
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, type: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/feedback/${id}`, { method: 'DELETE', headers: withCsrfHeaders() })
      if (!res.ok) throw new Error('Failed to delete feedback')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] })
      setDeleteTarget(null)
      toast({ title: 'Success', description: 'Feedback deleted successfully', type: 'success' })
    },
  })

  return {
    type,
    setType,
    status,
    setStatus,
    search,
    setSearch,
    replyTarget,
    setReplyTarget,
    replyText,
    setReplyText,
    deleteTarget,
    setDeleteTarget,
    feedbacks,
    isLoading,
    updateStatusMutation,
    replyMutation,
    deleteMutation,
  }
}
