"use client"

import * as React from "react"
import { useToast } from "@/hooks/useToast"
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg bg-card text-card-foreground transition-all duration-200 animate-in slide-in-from-bottom-5 ${
            t.type === 'success'
              ? 'border-success-border bg-success-bg/80 text-success-fg'
              : t.type === 'error'
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : t.type === 'warning'
              ? 'border-warning-border bg-warning-bg/80 text-warning-fg'
              : 'border-border'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />}
          {t.type === 'error' && <XCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          {t.type === 'warning' && <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
          {(!t.type || t.type === 'default') && <Info className="w-5 h-5 shrink-0 mt-0.5 text-primary" />}
          
          <div className="flex-1 text-sm">
            {t.title && <div className="font-semibold">{t.title}</div>}
            {t.description && <div className="text-xs opacity-90 mt-0.5">{t.description}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
