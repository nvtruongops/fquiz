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
          <h2 className="text-2xl font-bold text-card-foreground">Question Bank Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Analyze question usage frequency and quality across subjects
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions, answers, codes..."
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
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
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
            {debouncedSearch ? 'Questions Found' : 'Total Questions'}
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
              ? `No questions found matching "${debouncedSearch}"`
              : selectedCategory !== 'all'
              ? 'No questions found in this category'
              : 'No questions in the Question Bank'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Questions List</CardTitle>
              {data.total_pages > 1 && (
                <div className="text-sm text-muted-foreground">
                  Page {data.page} of {data.total_pages} (Total: {data.total_questions} questions)
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
