'use client'

import { useTranslations } from '@fquiz/ui/i18n'

export function ExplorePageHeading() {
  const t = useTranslations()
  return (
    <div className="text-center max-w-3xl mx-auto px-2 space-y-1.5">
      <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-foreground tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-3 duration-500">
        {t('explore.pageTitle')}
      </h1>
      <p className="text-xs sm:text-sm font-semibold text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
        {t('explore.pageDescription')}
      </p>
    </div>
  )
}
