import { useState, useEffect, useCallback } from 'react'

export interface AnalyticsQuestion {
  _id: string
  text: string
  options: string[]
  correct_answer: number[]
  usage_count: number
  used_in_quizzes: string[]
}

export interface AnalyticsData {
  total_questions: number
  questions: AnalyticsQuestion[]
  page: number
  total_pages: number
  per_page: number
}

export function useQuestionBankAnalytics(initialCategory: string = 'all') {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchAnalytics = useCallback(async (category: string, page: number, search: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category && category !== 'all') {
        params.set('category_id', category)
      }
      params.set('page', String(page))
      params.set('per_page', '100')
      if (search.trim()) {
        params.set('search', search.trim())
      }

      const response = await fetch(`/api/question-bank/analytics?${params.toString()}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setCurrentPage(1)
    fetchAnalytics(selectedCategory, 1, debouncedSearch)
  }, [selectedCategory, debouncedSearch, fetchAnalytics])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchAnalytics(selectedCategory, page, debouncedSearch)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return {
    loading,
    data,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    currentPage,
    handlePageChange,
  }
}
