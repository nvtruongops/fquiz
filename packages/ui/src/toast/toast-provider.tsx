'use client'

import React, { useEffect, useState } from 'react'
import { useToast, type Toast } from './toast-store'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '../lib/utils'

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const isAlert = toast.type === 'error' || toast.type === 'warning'

  return (
    <div
      role={isAlert ? 'alert' : 'status'}
      aria-atomic="true"
      className={cn(
        'pointer-events-auto relative overflow-hidden flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl',
        'border border-border/80 shadow-xl shadow-black/5 dark:shadow-black/20 ring-1 ring-black/5 dark:ring-white/10',
        'bg-card/95 backdrop-blur-2xl text-foreground transition-all',
        'animate-in fade-in slide-in-from-top-2 sm:slide-in-from-bottom-2 duration-300'
      )}
    >
      {/* Status Stripe */}
      <span
        aria-hidden="true"
        className={cn(
          'w-1 absolute left-0 inset-y-0 rounded-l-2xl',
          toast.type === 'success' && 'bg-success-fg',
          toast.type === 'error' && 'bg-incorrect-fg',
          toast.type === 'warning' && 'bg-warning-fg',
          toast.type === 'info' && 'bg-primary'
        )}
      />

      {/* Icon Badge */}
      <div
        className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
          toast.type === 'success' && 'bg-success-bg text-success-fg ring-1 ring-success-border',
          toast.type === 'error' && 'bg-incorrect-bg text-incorrect-fg ring-1 ring-incorrect-border',
          toast.type === 'warning' && 'bg-warning-bg text-warning-fg ring-1 ring-warning-border',
          toast.type === 'info' && 'bg-primary/10 text-primary ring-1 ring-primary/20'
        )}
      >
        {toast.type === 'success' && <CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
        {toast.type === 'error' && <AlertCircle className="w-4 h-4" aria-hidden="true" />}
        {toast.type === 'warning' && <AlertTriangle className="w-4 h-4" aria-hidden="true" />}
        {toast.type === 'info' && <Info className="w-4 h-4" aria-hidden="true" />}
      </div>

      {/* Text Content */}
      <div className="flex-1 min-w-0 pr-1 space-y-0.5">
        {toast.title && (
          <p className="text-xs font-black text-foreground tracking-tight leading-snug">
            {toast.title}
          </p>
        )}
        <p
          className={cn(
            'text-xs leading-relaxed',
            toast.title ? 'text-muted-foreground font-medium' : 'text-foreground font-semibold'
          )}
        >
          {toast.message}
        </p>

        {/* Action Button if provided */}
        {toast.action && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick()
                onRemove(toast.id)
              }}
              className="text-xs font-black text-primary hover:underline inline-flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              {toast.action.label} →
            </button>
          </div>
        )}
      </div>

      {/* Close Button */}
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="w-8 h-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shrink-0 cursor-pointer -mr-1 -mt-1"
        title="Close notification"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export function ToastProvider() {
  const { toasts, removeToast } = useToast()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    if (typeof window !== 'undefined') {
      ;(window as any).__toast = useToast.getState().toast
    }
  }, [])

  if (!isMounted || toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-relevant="additions text"
      className="fixed top-3 inset-x-3 sm:top-auto sm:bottom-6 sm:right-6 sm:inset-x-auto z-[100] w-auto sm:w-full max-w-sm mx-auto sm:mx-0 flex flex-col gap-2.5 pointer-events-none transition-all"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}

export { ToastProvider as Toaster }
export default ToastProvider
