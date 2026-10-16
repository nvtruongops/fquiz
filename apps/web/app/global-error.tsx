'use client'

import React, { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log unexpected root crashes
    console.error('[GlobalError] Root layout crash caught:', error)
  }, [error])

  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-background text-foreground font-sans flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl border border-border bg-card p-8 text-center shadow-2xl space-y-5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 text-2xl font-black">
            !
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-foreground">Critical Server Error</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The application encountered an unexpected error during initialization. Your account data remains secure.
            </p>
            {error?.digest && (
              <p className="text-[10px] font-mono text-muted-foreground bg-muted/60 py-1 px-2.5 rounded-lg inline-block">
                Error code: {error.digest}
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={() => {
                globalThis.location.href = '/'
              }}
              className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs transition-all cursor-pointer active:scale-95"
            >
              Home page
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
