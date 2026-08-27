'use client'

import { useToast } from '@/store/shared/toast-store'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/core/utils/cn'

export default function ToastProvider() {
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
    <div className="fixed top-4 inset-x-3 sm:top-auto sm:bottom-6 sm:right-6 sm:inset-x-auto z-[100] w-auto sm:w-full max-w-sm sm:max-w-[380px] mx-auto sm:mx-0 flex flex-col gap-2.5 pointer-events-none transition-all">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border bg-card/95 backdrop-blur-xl transition-all duration-300",
            "animate-in fade-in slide-in-from-top-3 sm:slide-in-from-bottom-3 duration-250",
            toast.type === 'success' && "border-emerald-500/30 dark:border-emerald-500/20 shadow-emerald-500/5",
            toast.type === 'error' && "border-rose-500/30 dark:border-rose-500/20 shadow-rose-500/5",
            toast.type === 'info' && "border-primary/30 dark:border-primary/20 shadow-primary/5"
          )}
        >
          {/* Icon Pill */}
          <div className={cn(
            "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs",
            toast.type === 'success' && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
            toast.type === 'error' && "bg-rose-500/15 text-rose-600 dark:text-rose-400",
            toast.type === 'info' && "bg-primary/15 text-primary"
          )}>
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4" />}
            {toast.type === 'info' && <Info className="w-4 h-4" />}
          </div>
          
          {/* Message Content */}
          <div className="flex-1 min-w-0 pr-1">
            <p className="text-xs sm:text-[13px] font-bold text-foreground leading-snug">
              {toast.message}
            </p>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0 cursor-pointer active:scale-95"
            title="Đóng"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Micro Progress Bar Animation */}
          <div className="absolute bottom-0 left-0 h-0.5 bg-muted/40 w-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-[width] ease-linear",
                toast.type === 'success' && "bg-emerald-500",
                toast.type === 'error' && "bg-rose-500",
                toast.type === 'info' && "bg-primary"
              )}
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
