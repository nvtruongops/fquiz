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
    <p role="status" aria-live="polite" className="sr-only">
      {showImmediateFeedback ? 'Saving answer…' : 'Checking answer…'}
    </p>
  )
}
