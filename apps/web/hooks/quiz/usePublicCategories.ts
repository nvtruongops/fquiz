'use client'

import { useQuery } from '@tanstack/react-query'

export interface CategoryItem {
  id: string
  name: string
  quizCount: number
}

export interface UsePublicCategoriesOptions {
  initialData?: CategoryItem[]
}

export async function fetchPublicCategories(): Promise<CategoryItem[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''
  const res = await fetch(`${baseUrl}/api/v1/public/categories`, {
    headers: {
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}))
    throw new Error(
      errorJson.message || errorJson.error || `Failed to load course categories (${res.status})`
    )
  }
  const json = await res.json()
  return (json.data || []).map((cat: any) => ({
    id: cat.id || cat._id,
    name: cat.name,
    quizCount: cat.publishedQuizCount || cat.quizCount || 0,
  }))
}

export function usePublicCategories(options?: UsePublicCategoriesOptions) {
  const query = useQuery<CategoryItem[]>({
    queryKey: ['public', 'categories'],
    queryFn: fetchPublicCategories,
    initialData: options?.initialData && options.initialData.length > 0 ? options.initialData : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  return {
    ...query,
    categories: query.data ?? [],
  }
}
