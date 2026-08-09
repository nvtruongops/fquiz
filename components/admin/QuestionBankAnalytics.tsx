'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Badge } from '@/components/shared/ui/badge'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/shared/ui/collapsible'
import { Loader2, ChevronDown, ChevronUp, Search, X } from 'lucide-react'

interface AnalyticsData {
  total_questions: number
  questions: Array<{
    _id: string
    text: string
    options: string[]
    correct_answer: number[]
    usage_count: number
    used_in_quizzes: string[]
  }>
  page: number
  total_pages: number
  per_page: number
}

interface Category {
  _id: string
  name: string
}

interface QuestionBankAnalyticsProps {
  categories: Category[]
}

export function QuestionBankAnalytics({ categories }: QuestionBankAnalyticsProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)

  // Debounce search input
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

  // When category or debounced search changes, reset to page 1 and fetch
  useEffect(() => {
    setCurrentPage(1)
    fetchAnalytics(selectedCategory, 1, debouncedSearch)
  }, [selectedCategory, debouncedSearch, fetchAnalytics])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchAnalytics(selectedCategory, page, debouncedSearch)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">
            Thống kê Ngân hàng Câu hỏi
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Phân tích mức độ sử dụng và chất lượng câu hỏi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Bar */}
          <div className="relative w-full sm:w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm câu hỏi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Select */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Chọn môn học" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả môn học</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat._id} value={cat._id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {debouncedSearch ? 'Số câu hỏi tìm thấy' : 'Tổng câu hỏi'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-card-foreground">{data?.total_questions ?? 0}</div>
        </CardContent>
      </Card>

      {/* Questions List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data || !data.questions || data.questions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {debouncedSearch
              ? `Không tìm thấy câu hỏi phù hợp với từ khóa "${debouncedSearch}"`
              : selectedCategory !== 'all'
              ? 'Chưa có câu hỏi nào trong ngân hàng môn học này'
              : 'Chưa có câu hỏi nào trong ngân hàng'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Danh sách câu hỏi</CardTitle>
              {data.total_pages > 1 && (
                <div className="text-sm text-muted-foreground">
                  Trang {data.page} / {data.total_pages} (Tổng: {data.total_questions} câu)
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.questions.map((question, idx) => (
                <QuestionItem 
                  key={question._id} 
                  question={question} 
                  index={(data.page - 1) * data.per_page + idx} 
                />
              ))}
            </div>

            {/* Pagination */}
            {data.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  Trước
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: data.total_pages }, (_, i) => i + 1)
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === data.total_pages ||
                        Math.abs(page - currentPage) <= 1
                      )
                    })
                    .map((page, idx, arr) => {
                      const prevPage = arr[idx - 1]
                      const showEllipsis = prevPage && page - prevPage > 1

                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsis && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={page === currentPage ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            disabled={loading}
                            className="min-w-[40px]"
                          >
                            {page}
                          </Button>
                        </div>
                      )
                    })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === data.total_pages || loading}
                >
                  Sau
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function QuestionItem({
  question,
  index,
}: {
  question: {
    _id: string
    text: string
    options: string[]
    correct_answer: number[]
    usage_count: number
    used_in_quizzes: string[]
  }
  index: number
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors text-card-foreground">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-2">
              <span className="text-sm font-bold text-muted-foreground mt-1">
                #{index + 1}
              </span>
              <p className="font-medium text-card-foreground flex-1">{question.text}</p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 ml-8">
              <Badge variant="secondary" className="text-xs">
                Dùng {question.usage_count} lần
              </Badge>
              {question.used_in_quizzes.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Trong:</span>
                  {question.used_in_quizzes.slice(0, 3).map((code) => (
                    <Badge key={code} variant="outline" className="text-[10px]">
                      {code}
                    </Badge>
                  ))}
                  {question.used_in_quizzes.length > 3 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{question.used_in_quizzes.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1">
              {isOpen ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Ẩn
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Xem
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="mt-3 ml-8">
          <div className="space-y-2 pt-2 border-t border-border">
            {question.options.map((option, idx) => {
              const isCorrect = question.correct_answer.includes(idx)
              return (
                <div
                  key={idx}
                  className={`p-3 rounded border text-sm ${
                    isCorrect
                      ? 'bg-success-bg border-success-border font-medium text-success-fg'
                      : 'bg-muted/40 border-border text-card-foreground'
                  }`}
                >
                  <span className="font-bold mr-2">
                    {String.fromCodePoint(65 + idx)}.
                  </span>
                  {option}
                  {isCorrect && (
                    <span className="ml-2 text-green-600 font-bold">✓</span>
                  )}
                </div>
              )
            })}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
