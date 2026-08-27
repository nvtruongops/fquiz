'use client'

import React, { useEffect, useState } from 'react'
import { useToast } from './toast-store'
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react'

export function ToastProvider() {
  const { toasts, removeToast } = useToast()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) return null

  return (
    <div className="fixed bottom-0 right-0 z-[100] p-6 w-full max-w-[420px] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto
            relative overflow-hidden
            flex items-start gap-3 p-4 rounded-2xl shadow-2xl border
            bg-card/90 backdrop-blur-xl
            animate-in fade-in slide-in-from-right-8 duration-300
            ${toast.type === 'success' ? 'border-success-border' : ''}
            ${toast.type === 'error' ? 'border-incorrect-border' : ''}
            ${toast.type === 'info' ? 'border-info-border' : ''}
          `}
        >
          <div className="flex-shrink-0 mt-0.5">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-success-fg" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-incorrect-fg" />}
            {toast.type === 'info' && <AlertCircle className="w-5 h-5 text-info-fg" />}
          </div>
          
          <div className="flex-1 min-w-0 pr-6">
            <p className={`text-sm font-bold leading-relaxed ${toast.type === 'error' ? 'text-incorrect-fg' : 'text-card-foreground'}`}>
              {toast.message}
            </p>
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute bottom-0 left-0 h-1 bg-muted w-full overflow-hidden rounded-b-2xl opacity-30">
            <div 
              className={`h-full transition-[width] ease-linear
                ${toast.type === 'success' ? 'bg-success-fg' : 'bg-incorrect-fg'}`}
              style={{ width: '0%', transitionDuration: '5000ms' }}
              ref={(el) => {
                if (el) setTimeout(() => { el.style.width = '100%' }, 10)
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export { ToastProvider as Toaster }
