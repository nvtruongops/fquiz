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
  created_at: string
  status: 'pending' | 'approved' | 'rejected'
  type: 'private' | 'public'
}

export interface Topic {
  _id: string
  name: string
  slug: string
  path: string
  parentTopicId?: string | null
  status: string
}

export interface TextGenreItem {
  _id: string
  name: string
  code: string
  icon?: string
  description?: string
  defaultTone?: string
  status: string
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

async function fetchAdminTopics(): Promise<{ topics: Topic[] }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/topics`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch topics')
  return res.json()
}

async function createAdminTopic(data: { name: string; slug?: string }): Promise<{ topic: Topic }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/topics`, {
    method: 'POST',
    credentials: 'include',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Failed to create topic')
  }
  return res.json()
}

async function updateAdminTopic(id: string, data: { name: string; slug?: string }): Promise<{ topic: Topic }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/topics/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Failed to update topic')
  }
  return res.json()
}

async function deleteAdminTopic(id: string): Promise<void> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/topics/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: withCsrfHeaders(),
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Failed to delete topic')
  }
}

async function fetchAdminGenres(): Promise<{ genres: TextGenreItem[] }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/genres`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch genres')
  return res.json()
}

async function createAdminGenre(data: { name: string; description?: string }): Promise<{ genre: TextGenreItem }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/genres`, {
    method: 'POST',
    credentials: 'include',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Failed to create genre')
  }
  return res.json()
}

async function deleteAdminGenre(id: string): Promise<void> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/genres/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: withCsrfHeaders(),
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Failed to delete genre')
  }
}

export function useAdminCategories() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [mainTab, setMainTab] = useState<'ai_learning' | 'quiz_exam'>('ai_learning')
  const [aiSubTab, setAiSubTab] = useState<'topic' | 'genre'>('topic')

  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [search, setSearch] = useState('')

  const [topicName, setTopicName] = useState('')
  const [topicSlug, setTopicSlug] = useState('')
  const [editTopicId, setEditTopicId] = useState<string | null>(null)
  const [editTopicName, setEditTopicName] = useState('')
  const [editTopicSlug, setEditTopicSlug] = useState('')
  const [deleteTopicTarget, setDeleteTopicTarget] = useState<Topic | null>(null)

  const [genreName, setGenreName] = useState('')
  const [genreDesc, setGenreDesc] = useState('')
  const [deleteGenreTarget, setDeleteGenreTarget] = useState<TextGenreItem | null>(null)

  const { data: categoryData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['admin', 'categories', search],
    queryFn: () => fetchCategories(search, 'approved'),
    enabled: mainTab === 'quiz_exam',
  })

  const { data: topicData, isLoading: isTopicsLoading } = useQuery({
    queryKey: ['admin', 'topics'],
    queryFn: fetchAdminTopics,
    enabled: mainTab === 'ai_learning',
  })

  const { data: genreData, isLoading: isGenresLoading } = useQuery({
    queryKey: ['admin', 'genres'],
    queryFn: fetchAdminGenres,
    enabled: mainTab === 'ai_learning',
  })

  const publicCategories = (categoryData?.categories ?? []).filter((cat) => cat.type === 'public')
  const topics = topicData?.topics ?? []
  const genres = genreData?.genres ?? []

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

  const createTopicMutation = useMutation({
    mutationFn: createAdminTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'topics'] })
      setTopicName('')
      setTopicSlug('')
      toast.success('Đã thêm chủ đề mới')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateTopicMutation = useMutation({
    mutationFn: ({ id, name, slug }: { id: string; name: string; slug?: string }) => updateAdminTopic(id, { name, slug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'topics'] })
      setEditTopicId(null)
      setEditTopicName('')
      setEditTopicSlug('')
      toast.success('Đã cập nhật chủ đề')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteTopicMutation = useMutation({
    mutationFn: deleteAdminTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'topics'] })
      setDeleteTopicTarget(null)
      toast.success('Đã xóa chủ đề')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createGenreMutation = useMutation({
    mutationFn: createAdminGenre,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'genres'] })
      setGenreName('')
      setGenreDesc('')
      toast.success('Đã thêm thể loại văn bản mới')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteGenreMutation = useMutation({
    mutationFn: deleteAdminGenre,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'genres'] })
      setDeleteGenreTarget(null)
      toast.success('Đã xóa thể loại văn bản')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return {
    mainTab, setMainTab,
    aiSubTab, setAiSubTab,
    newName, setNewName,
    editId, setEditId,
    editName, setEditName,
    deleteTarget, setDeleteTarget,
    search, setSearch,
    topicName, setTopicName,
    topicSlug, setTopicSlug,
    editTopicId, setEditTopicId,
    editTopicName, setEditTopicName,
    editTopicSlug, setEditTopicSlug,
    deleteTopicTarget, setDeleteTopicTarget,
    genreName, setGenreName,
    genreDesc, setGenreDesc,
    deleteGenreTarget, setDeleteGenreTarget,
    isCategoriesLoading, publicCategories,
    isTopicsLoading, topics,
    isGenresLoading, genres,
    createMutation, updateMutation, deleteMutation,
    createTopicMutation, updateTopicMutation, deleteTopicMutation,
    createGenreMutation, deleteGenreMutation,
  }
}
