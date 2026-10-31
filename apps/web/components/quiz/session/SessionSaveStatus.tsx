'use client'

import React from 'react'

export function AnswerSaveBlockedNotice({ blocked }: { blocked: boolean }) {
  if (!blocked) return null
  return (
    <p role="status" className="text-center text-xs text-muted-foreground">
      Wait for saving to finish, or close this dialog and retry failed saves before submitting.
    </p>
  )
}

export function SessionSaveStatus({ status, onRetry, disabled }: {
  status: 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'
  onRetry: () => void
  disabled: boolean
}) {
  if (status !== 'error') return null
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground">
      <span role="status">Failed to save</span>
      <button type="button" onClick={onRetry} disabled={disabled} className="min-h-11 rounded px-3 font-semibold text-primary underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">Retry</button>
    </div>
  )
}
