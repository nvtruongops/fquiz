'use client'

import { QuestionBankTabs } from '@/components/question-bank/QuestionBankTabs'
import { useTranslations } from '@fquiz/ui/i18n'

interface QuestionBankPageViewProps {
  categories?: Array<{ _id: string; name: string }>
  error?: boolean
}

export function QuestionBankPageView({ categories = [], error = false }: QuestionBankPageViewProps) {
  const t = useTranslations()
  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-destructive mb-2">{t('adminQuestionBank.loadErrorTitle')}</h2>
        <p className="text-muted-foreground text-sm">{t('adminQuestionBank.loadErrorDescription')}</p>
      </div>
    )
  }
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('adminQuestionBank.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('adminQuestionBank.description')}</p>
      </div>
      <QuestionBankTabs categories={categories} />
    </div>
  )
}
