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
import { useTranslations } from '@fquiz/ui/i18n'

interface Category {
  _id: string
  name: string
}

interface QuestionBankAnalyticsProps {
  categories: Category[]
}

export function QuestionBankAnalytics({ categories }: QuestionBankAnalyticsProps) {
  const t = useTranslations()
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
          <h2 className="text-2xl font-bold text-card-foreground">{t('questionBankAnalytics.analyticsTitle')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('questionBankAnalytics.analyticsDescription')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder={t('questionBankAnalytics.searchPlaceholder')}
              aria-label={t('questionBankAnalytics.searchLabel')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={t('questionBankAnalytics.clearSearch')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[220px]" aria-label={t('questionBankAnalytics.filterCategory')}>
              <SelectValue placeholder={t('questionBankAnalytics.selectCategory')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('questionBankAnalytics.allCategories')}</SelectItem>
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
            {debouncedSearch ? t('questionBankAnalytics.questionsFound') : t('questionBankAnalytics.totalQuestions')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-card-foreground">{data?.total_questions ?? 0}</div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : !data || !data.questions || data.questions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {debouncedSearch
              ? t('questionBankAnalytics.emptySearch', { query: debouncedSearch })
              : selectedCategory !== 'all'
              ? t('questionBankAnalytics.emptyCategory')
              : t('questionBankAnalytics.emptyBank')}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('questionBankAnalytics.questionsList')}</CardTitle>
              {data.total_pages > 1 && (
                <div className="text-sm text-muted-foreground">
                  {t('questionBankAnalytics.page')} {data.page} {t('questionBankAnalytics.of')} {data.total_pages} {t('questionBankAnalytics.total', { count: data.total_questions })}
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
