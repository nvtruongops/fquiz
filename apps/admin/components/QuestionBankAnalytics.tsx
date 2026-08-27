'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Search, X } from 'lucide-react'
import { useQuestionBankAnalytics } from '@/hooks/question-bank/useQuestionBankAnalytics'
import { AnalyticsQuestionItem } from './question-bank/analytics/AnalyticsQuestionItem'
import { AnalyticsPagination } from './question-bank/analytics/AnalyticsPagination'

interface Category {
  _id: string
  name: string
}

interface QuestionBankAnalyticsProps {
  categories: Category[]
}

export function QuestionBankAnalytics({ categories }: QuestionBankAnalyticsProps) {
  const {
    loading,
    data,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    currentPage,
    handlePageChange,
  } = useQuestionBankAnalytics('all')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">Thống kê Ngân hàng Câu hỏi</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Phân tích mức độ sử dụng và chất lượng câu hỏi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm câu hỏi, đáp án, mã môn..."
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
                <AnalyticsQuestionItem
                  key={question._id}
                  question={question}
                  index={(data.page - 1) * data.per_page + idx}
                />
              ))}
            </div>

            <AnalyticsPagination
              currentPage={currentPage}
              totalPages={data.total_pages}
              loading={loading}
              onPageChange={handlePageChange}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
