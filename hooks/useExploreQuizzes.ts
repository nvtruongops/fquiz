'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { API_ROUTES } from '@/lib/core/constants/api-routes'
import { useDebounce } from '@/hooks/shared/useDebounce'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useAuth } from '@/hooks/auth/useAuth'

export interface Category {
  id: string
  name: string
  publishedQuizCount?: number
}

export interface QuizMeta {
  id: string
  title: string
  course_code: string
  source_label: string
  source_creator_name?: string | null
  questionCount: number
  studentCount: number
  categoryId: string
  categoryName: string
  latestCorrectCount?: number | null
  latestTotalCount?: number | null
  latestScoreOnTen?: number | null
  totalStudyMinutes?: number | null
}

async function fetchCategories(): Promise<{ data: Category[] }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.PUBLIC.CATEGORIES}`)
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

async function fetchPinnedCategories(): Promise<{ pinnedCategories: string[] }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.STUDENT.PINNED_CATEGORIES}`)
  if (!res.ok) return { pinnedCategories: [] }
  return res.json()
}

async function togglePinCategory(categoryId: string): Promise<{ pinned: boolean; pinnedCategories: string[]; error?: string }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.STUDENT.PINNED_CATEGORIES}`, {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ categoryId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to pin category')
  return data
}

async function fetchQuizzes(params: {
  categoryId?: string
  search?: string
  isLoggedIn: boolean
  limit?: number
  offset?: number
}): Promise<{ data: QuizMeta[] }> {
  const p = new URLSearchParams()
  if (params.categoryId) p.set('category_id', params.categoryId)
  if (params.search) p.set('search', params.search)
  p.set('sort', 'popular')
  if (params.limit) p.set('limit', String(params.limit))
  if (params.offset) p.set('offset', String(params.offset))
  const endpoint = params.isLoggedIn ? API_ROUTES.STUDENT.EXPLORE_QUIZZES : API_ROUTES.PUBLIC.QUIZZES
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${endpoint}?${p}`)
  if (!res.ok) throw new Error('Failed to fetch quizzes')
  return res.json()
}

export function useExploreQuizzes() {
  const [search, setSearch] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  
  const { data: authData, isLoading: authLoading } = useAuth()
  const user = authLoading ? undefined : (authData?.user ?? null)

  const [activeTab, setActiveTab] = useState<'explore' | 'mix'>('explore')
  const debouncedSearch = useDebounce(search, 300)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const contentRef = useRef<HTMLDivElement>(null)

  const searchParams = useSearchParams()

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'mix') setActiveTab('mix')
    else setActiveTab('explore')
  }, [searchParams])

  const { data: catData, isLoading: catsLoading } = useQuery({
    queryKey: ['public', 'categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const { data: pinnedData } = useQuery({
    queryKey: ['student', 'pinned-categories'],
    queryFn: fetchPinnedCategories,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const pinMutation = useMutation({
    mutationFn: (categoryId: string) => togglePinCategory(categoryId),
    onSuccess: (data) => {
      queryClient.setQueryData(['student', 'pinned-categories'], { pinnedCategories: data.pinnedCategories })
      toast.success(data.pinned ? 'Đã ghim môn học' : 'Đã bỏ ghim môn học')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const categories = useMemo(() => {
    const list = (catData?.data ?? []).filter(c => 
      !['Tư tưởng HCM', 'Triết học', 'Kinh tế chính trị'].includes(c.name)
    )
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [catData])

  const pinnedIds = useMemo(() => new Set(pinnedData?.pinnedCategories ?? []), [pinnedData])

  const { data: categoryQuizzes, isLoading: quizzesLoading } = useQuery({
    queryKey: ['explore', 'quizzes', selectedCategoryId, !!user],
    queryFn: () => fetchQuizzes({ 
      categoryId: selectedCategoryId!, 
      isLoggedIn: !!user,
      limit: 48
    }),
    enabled: !!selectedCategoryId && !debouncedSearch,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id)
    }
  }, [categories, selectedCategoryId])

  return {
    search, setSearch,
    selectedCategoryId, setSelectedCategoryId,
    activeTab, setActiveTab,
    debouncedSearch,
    user,
    categories, catsLoading,
    pinnedIds,
    pinMutation,
    categoryQuizzes: categoryQuizzes?.data ?? [],
    quizzesLoading,
    contentRef,
  }
}
