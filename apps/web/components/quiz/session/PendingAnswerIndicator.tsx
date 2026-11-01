import React from 'react'
import { useTranslations } from '@fquiz/ui/i18n'

export function PendingAnswerIndicator({
  mode,
  submitted,
  isPending,
  showImmediateFeedback,
}: {
  mode: string
  submitted: boolean
  isPending: boolean
  showImmediateFeedback: boolean
}) {
  const t = useTranslations()
  if (mode !== 'immediate' || !submitted || !isPending) return null

  return (
    <p role="status" aria-live="polite" className="sr-only">
      {t(showImmediateFeedback ? 'session.savingAnswer' : 'session.checkingAnswer')}
    </p>
  )
}
