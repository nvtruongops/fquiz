import React from 'react'

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
  if (mode !== 'immediate' || !submitted || !isPending) return null

  return (
    <p role="status" aria-live="polite" className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm">
      {showImmediateFeedback ? 'Saving answer…' : 'Checking answer…'}
    </p>
  )
}
