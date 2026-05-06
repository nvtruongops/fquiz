'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'

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
  const [currentPage, setCurrentPage] = useState(1)

  const fetchAnalytics = useCallback(async (page: number = currentPage) => {
    setLoading(true)
    try {
      const url =
        selectedCategory === 'all'
          ? '/api/question-bank/analytics'
          : `/api/question-bank/analytics?category_id=${selectedCategory}&page=${page}&per_page=100`

      const response = await fetch(url, { credentials: 'include' })

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const result = await response.json()
      setData(result)
      setCurrentPage(page)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, currentPage])

  useEffect(() => {
    setCurrentPage(1) // Reset to page 1 when category changes
    fetchAnalytics(1)
  }, [selectedCategory, fetchAnalytics])

  const handlePageChange = (page: number) => {
    fetchAnalytics(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        Không thể tải dữ liệu thống kê
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Thống kê Ngân hàng Câu hỏi
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Phân tích mức độ sử dụng và chất lượng câu hỏi
          </p>
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[250px]">
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

      {/* Overview Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Tổng câu hỏi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data.total_questions}</div>
        </CardContent>
      </Card>

      {/* Questions List */}
      {data.questions && data.questions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Danh sách câu hỏi</CardTitle>
              {data.total_pages > 1 && (
                <div className="text-sm text-gray-500">
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
                      // Show first page, last page, current page, and pages around current
                      return (
                        page === 1 ||
                        page === data.total_pages ||
                        Math.abs(page - currentPage) <= 1
                      )
                    })
                    .map((page, idx, arr) => {
                      // Add ellipsis if there's a gap
                      const prevPage = arr[idx - 1]
                      const showEllipsis = prevPage && page - prevPage > 1

                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsis && (
                            <span className="px-2 text-gray-400">...</span>
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

      {selectedCategory !== 'all' && data.questions && data.questions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Chưa có câu hỏi nào trong ngân hàng môn học này
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
      <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-2">
              <span className="text-sm font-bold text-gray-400 mt-1">
                #{index + 1}
              </span>
              <p className="font-medium text-gray-900 flex-1">{question.text}</p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 ml-8">
              <Badge variant="secondary" className="text-xs">
                Dùng {question.usage_count} lần
              </Badge>
              {question.used_in_quizzes.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Trong:</span>
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
          <div className="space-y-2 pt-2 border-t">
            {question.options.map((option, idx) => {
              const isCorrect = question.correct_answer.includes(idx)
              return (
                <div
                  key={idx}
                  className={`p-3 rounded border text-sm ${
                    isCorrect
                      ? 'bg-green-50 border-green-300 font-medium'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <span className="font-bold mr-2">
                    {String.fromCharCode(65 + idx)}.
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
