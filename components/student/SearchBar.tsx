'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { normalizeSearchInput, clampPagination, sanitizeQueryParams } from '@/lib/client-validation'

interface SearchResult {
  _id: string
  title: string
  course_code: string
  category_id: string
  questionCount: number
}

interface SearchResponse {
  quizzes: SearchResult[]
  total: number
  page: number
  limit: number
}

interface Category {
  _id: string
  name: string
}

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/categories`)
  if (!res.ok) throw new Error('Failed to fetch categories')
  const data = await res.json()
  return data.categories as Category[]
}

async function fetchSearch(params: {
  category: string
  course_code: string
  page: number
}): Promise<SearchResponse> {
  // Normalize and validate inputs
  const normalizedCourseCode = normalizeSearchInput(params.course_code, 50)
  const normalizedCategory = normalizeSearchInput(params.category, 100)
  const { page, limit } = clampPagination(params.page, 20)
  
  const queryParams = sanitizeQueryParams({
    category: normalizedCategory,
    course_code: normalizedCourseCode,
    page,
    limit,
  })
  
  const query = new URLSearchParams(queryParams)
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/search?${query}`)
  if (!res.ok) throw new Error('Search failed')
  return res.json()
}

function SearchSkeleton() {
  return (
    <div className="flex flex-col gap-3 mt-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-20 rounded-lg animate-pulse"
          style={{ backgroundColor: '#B0D4B8' }}
        />
      ))}
    </div>
  )
}

export default function SearchBar() {
  const [rawCourseCode, setRawCourseCode] = useState('')
  const [debouncedCourseCode, setDebouncedCourseCode] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)

  // Debounce course code input 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCourseCode(rawCourseCode.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [rawCourseCode])

  // Reset page when category changes
  useEffect(() => {
    setPage(1)
  }, [category])

  const hasFilters = !!(category || debouncedCourseCode)

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 5,
  })

  const { data, isLoading, isError } = useQuery<SearchResponse>({
    queryKey: ['search', { category, course_code: debouncedCourseCode, page }],
    queryFn: () => fetchSearch({ category, course_code: debouncedCourseCode, page }),
    staleTime: 1000 * 60,
    enabled: hasFilters,
  })

  const quizzes = data?.quizzes ?? []
  const total = data?.total ?? 0
  const limit = data?.limit ?? 20
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by course code…"
          value={rawCourseCode}
          onChange={(e) => setRawCourseCode(e.target.value)}
          className="sm:max-w-xs border-[#B0D4B8] focus-visible:ring-[#5D7B6F]"
        />
        <Select
          value={category}
          onValueChange={(val) => setCategory(val === '__all__' ? '' : val)}
        >
          <SelectTrigger className="sm:max-w-xs border-[#B0D4B8] focus:ring-[#5D7B6F]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All categories</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat._id} value={cat.name}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results area */}
      {!hasFilters ? (
        <p className="text-sm text-gray-500 py-4">
          Enter a course code or select a category to search
        </p>
      ) : isLoading ? (
        <SearchSkeleton />
      ) : isError ? (
        <p className="text-sm text-red-600 py-4">
          Failed to load results. Please try again.
        </p>
      ) : quizzes.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">No results found.</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {quizzes.map((quiz) => (
              <Card
                key={quiz._id}
                className="border-0 shadow-sm"
                style={{ backgroundColor: '#EAE7D6' }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle
                      className="text-base font-semibold"
                      style={{ color: '#5D7B6F' }}
                    >
                      {quiz.title}
                    </CardTitle>
                    <Badge
                      className="shrink-0 border-0 text-white"
                      style={{ backgroundColor: '#B0D4B8', color: '#5D7B6F' }}
                    >
                      {quiz.course_code}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between pt-0">
                  <span className="text-sm text-gray-500">
                    {quiz.questionCount} questions
                  </span>
                  <Link
                    href={`/quiz/${quiz._id}/mode`}
                    className="px-4 py-1.5 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: '#5D7B6F' }}
                  >
                    Start Quiz
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2 pt-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-md text-sm font-medium border border-[#B0D4B8] disabled:opacity-40 hover:bg-[#B0D4B8]/30 transition-colors"
                style={{ color: '#5D7B6F' }}
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-md text-sm font-medium border border-[#B0D4B8] disabled:opacity-40 hover:bg-[#B0D4B8]/30 transition-colors"
                style={{ color: '#5D7B6F' }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
