'use client'

import { LegalSkeleton } from '@/components/legal/LegalSkeleton'
import { useTranslations } from '@fquiz/ui/i18n'

export function LegalLoading({ type }: { type: 'terms' | 'privacy' }) {
  const t = useTranslations()
  const title = t(type === 'terms' ? 'legal.termsTitle' : 'legal.privacyTitle')
  return <LegalSkeleton title={title} loadingLabel={t('legal.loading')} />
}
