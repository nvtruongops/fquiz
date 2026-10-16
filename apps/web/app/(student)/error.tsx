'use client'

import React, { useEffect } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[StudentError] Student Area Error Boundary caught:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center font-sans p-4">
      <div className="max-w-md w-full rounded-2xl sm:rounded-3xl border border-border bg-card text-card-foreground p-6 sm:p-8 text-center shadow-lg space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shadow-2xs">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-xl font-black text-foreground">
            Unable to load page data
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {error.message && !error.message.includes('An unexpected error')
              ? error.message
              : 'The server is temporarily unavailable or your network connection was interrupted.'}
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-muted-foreground bg-muted/60 py-1 px-2.5 rounded-lg inline-block">
              Error code: {error.digest}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs sm:text-sm font-bold text-foreground hover:bg-muted transition-colors cursor-pointer active:scale-95 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              globalThis.location.href = '/dashboard'
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs sm:text-sm font-black text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer active:scale-95 shadow-xs"
          >
            <Home className="w-3.5 h-3.5" />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
