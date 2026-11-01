'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { useTranslations } from '@fquiz/ui/i18n'

interface DashboardHeaderProps {
  user: { name?: string } | null
  showExploreAction: boolean
}

export const DashboardHeader = React.memo(function DashboardHeader({
  user,
  showExploreAction,
}: DashboardHeaderProps) {
  const t = useTranslations()
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t('dashboard.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.welcomeBack', { name: user?.name || t('common.student') })}</p>
      </div>

      {showExploreAction && (
        <Button asChild className="h-11 min-h-[44px] self-start rounded-xl px-4 font-semibold">
          <Link href="/explore">
            {t('dashboard.exploreQuizzes')} <ArrowRight aria-hidden="true" className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      )}
    </header>
  )
})
