'use client'

import React from 'react'
import Link from 'next/link'
import { AlertCircle, ShieldCheck, HelpCircle } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { useTranslations } from '@fquiz/ui/i18n'

interface QuizDetailErrorViewProps {
  error: any
  router: any
}

export function QuizDetailErrorView({ error, router }: QuizDetailErrorViewProps) {
  const t = useTranslations()
  const status = error?.status
  const code = error?.code
  const message = status === 403
    ? t('quizDetail.accessDeniedDescription')
    : status === 404
      ? t('quizDetail.notFoundDescription')
      : code === 'QUIZ_SOURCE_LOCKED'
        ? t('quizDetail.retakeUnavailableDescription')
        : t('quizDetail.unableToLoad')

  return (
    <div className="min-h-screen bg-background p-4 text-center">
      <div className="mx-auto mt-24 max-w-md rounded-2xl border border-border bg-card p-10 shadow-xl">
        {status === 403 ? (
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
            <ShieldCheck className="h-8 w-8 text-amber-400" />
          </div>
        ) : status === 404 ? (
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <HelpCircle className="h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
        )}

        <h2 className="mb-2 text-xl font-black uppercase tracking-tight text-foreground">
          {status === 403
            ? t('quizDetail.accessDenied')
            : status === 404
              ? t('quizDetail.notFound')
              : code === 'QUIZ_SOURCE_LOCKED'
                ? t('quizDetail.retakeUnavailable')
                : t('quizDetail.errorOccurred')}
        </h2>

        <p className="mb-8 font-medium text-muted-foreground">{message}</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {code === 'QUIZ_SOURCE_LOCKED' ? (
            <>
              <Button asChild className="bg-primary text-primary-foreground py-6">
                <Link href="/explore">{t('quizDetail.exploreQuizzes')}</Link>
              </Button>
              <Button asChild variant="outline" className="py-6 border-border">
                <Link href="/history">{t('quizDetail.viewHistory')}</Link>
              </Button>
            </>
          ) : status === 403 ? (
            <>
              <Button asChild className="bg-primary text-primary-foreground py-6">
                <Link href="/">{t('quizDetail.exploreQuizzes')}</Link>
              </Button>
              <Button asChild variant="outline" className="py-6 border-border">
                <Link href="/dashboard">{t('quizDetail.dashboard')}</Link>
              </Button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3 col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.history.length > 1) {
                    router.back()
                  } else {
                    router.push('/dashboard')
                  }
                }}
                className="py-6 border-border"
              >
                {t('quizDetail.goBack')}
              </Button>
              <Button asChild className="bg-primary text-primary-foreground py-6">
                <Link href="/dashboard">{t('quizDetail.dashboard')}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
