import React from 'react'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'

interface SessionQueryErrorProps {
  title: string
  message: string
  backLabel: string
  dashboardLabel: string
  mobile?: boolean
  canRetry: boolean
  onRetry: () => void
  onBack: () => void
  onDashboard: () => void
}

export function SessionQueryError({
  title,
  message,
  backLabel,
  dashboardLabel,
  mobile = false,
  canRetry,
  onRetry,
  onBack,
  onDashboard,
}: SessionQueryErrorProps) {
  return (
    <div className={mobile
      ? 'flex h-screen items-center justify-center bg-page-bg p-6 text-card-foreground'
      : 'flex min-h-screen items-center justify-center bg-background p-4 font-sans'}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <h2 className={`mb-2 text-xl font-black ${mobile ? 'text-card-foreground' : 'uppercase tracking-tight text-foreground'}`}>
          {title}
        </h2>
        <p className="mb-6 text-sm font-medium text-muted-foreground">{message}</p>
        <div className="space-y-3">
          {canRetry && (
            <Button
              type="button"
              onClick={onRetry}
              className={mobile
                ? 'w-full bg-primary py-6 text-primary-foreground hover:bg-primary/90 font-black cursor-pointer'
                : 'h-11 w-full rounded-xl bg-primary text-primary-foreground text-xs font-black'}
            >
              Retry
            </Button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className={mobile
                ? 'w-full py-6 font-bold border-border text-card-foreground hover:bg-muted cursor-pointer'
                : 'h-11 rounded-xl border-border text-xs font-bold'}
            >
              {backLabel}
            </Button>
            <Button
              type="button"
              onClick={onDashboard}
              className={mobile
                ? 'w-full bg-primary py-6 text-primary-foreground hover:bg-primary/90 font-black cursor-pointer'
                : 'h-11 rounded-xl bg-primary text-primary-foreground text-xs font-black'}
            >
              {dashboardLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
