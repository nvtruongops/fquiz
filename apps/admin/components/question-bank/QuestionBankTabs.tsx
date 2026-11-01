'use client'

import React from 'react'
import dynamicImport from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QuestionBankStatus } from '@/components/QuestionBankStatus'
import { Loader2 } from 'lucide-react'
import { useTranslations } from '@fquiz/ui/i18n'

function TabLoadingFallback() {
  const t = useTranslations()
  return (
    <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <span className="text-sm font-medium">{t('adminQuestionBank.loadingModule')}</span>
    </div>
  )
}

const QuestionBankAnalytics = dynamicImport(
  () => import('@/components/QuestionBankAnalytics').then((m) => ({ default: m.QuestionBankAnalytics })),
  { ssr: false, loading: () => <TabLoadingFallback /> }
)

const QuestionBankMigration = dynamicImport(
  () => import('@/components/QuestionBankMigration').then((m) => ({ default: m.QuestionBankMigration })),
  { ssr: false, loading: () => <TabLoadingFallback /> }
)

const QuestionBankConflictResolver = dynamicImport(
  () => import('@/components/QuestionBankConflictResolver').then((m) => ({ default: m.QuestionBankConflictResolver })),
  { ssr: false, loading: () => <TabLoadingFallback /> }
)

interface Category {
  _id: string
  name: string
}

interface QuestionBankTabsProps {
  categories: Category[]
}

export function QuestionBankTabs({ categories }: QuestionBankTabsProps) {
  const t = useTranslations()
  return (
    <Tabs defaultValue="status" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-xl">
        <TabsTrigger value="status">{t('adminQuestionBank.status')}</TabsTrigger>
        <TabsTrigger value="analytics">{t('adminQuestionBank.analytics')}</TabsTrigger>
        <TabsTrigger value="migration">{t('adminQuestionBank.migration')}</TabsTrigger>
        <TabsTrigger value="conflicts">{t('adminQuestionBank.conflicts')}</TabsTrigger>
      </TabsList>

      <TabsContent value="status">
        <QuestionBankStatus />
      </TabsContent>

      <TabsContent value="analytics">
        <QuestionBankAnalytics categories={categories} />
      </TabsContent>

      <TabsContent value="migration">
        <QuestionBankMigration categories={categories} />
      </TabsContent>

      <TabsContent value="conflicts">
        <QuestionBankConflictResolver categories={categories} />
      </TabsContent>
    </Tabs>
  )
}
