'use client'

import Link from 'next/link'
import { Button } from '@/components/shared/ui/button'
import { useTranslations, type TranslationKey, type TranslationValues } from '@fquiz/ui/i18n'

export function QuizResultText({ messageKey, values }: { messageKey: TranslationKey; values?: TranslationValues }) {
  const t = useTranslations()
  return <>{t(messageKey, values)}</>
}

export function QuizResultNotFound() {
  const t = useTranslations()
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full p-8 text-center bg-card rounded-2xl border border-border shadow-xl space-y-4">
        <h2 className="text-xl font-black text-foreground">{t('quizResult.notFoundTitle')}</h2>
        <p className="text-xs font-medium text-muted-foreground">{t('quizResult.notFoundDescription')}</p>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link href="/dashboard">
            <Button variant="outline" className="w-full h-10 rounded-xl text-xs font-bold border-border">
              {t('quizResult.backToDashboard')}
            </Button>
          </Link>
          <Link href="/explore">
            <Button className="w-full h-10 rounded-xl text-xs font-black bg-primary text-primary-foreground">
              {t('common.exploreQuizzes')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
