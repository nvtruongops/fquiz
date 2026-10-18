'use client'

import React from 'react'

export function SessionSaveStatus({ status, onRetry, onReviewDraft, onDiscardDraft, draftQuestionNumber, disabled }: {
  status: 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'
  onRetry: () => void
  onReviewDraft: () => void
  onDiscardDraft: () => void
  draftQuestionNumber: number | null
  disabled: boolean
}) {
  if (status === 'idle') return null
  const actionClass = 'min-h-11 rounded px-3 font-semibold text-primary underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground">
      <span role="status">{status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'unsaved' && draftQuestionNumber !== null ? `Not saved — question ${draftQuestionNumber}` : 'Not saved'}</span>
      {status === 'error' && (
        <button type="button" onClick={onRetry} disabled={disabled} className={actionClass}>Retry</button>
      )}
      {status === 'unsaved' && draftQuestionNumber !== null && (
        <>
          <button type="button" onClick={onReviewDraft} className={actionClass}>Review draft</button>
          <button type="button" onClick={onDiscardDraft} disabled={disabled} className={actionClass}>Discard draft</button>
        </>
      )}
    </div>
  )
}
