'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Hook ──────────────────────────────────────────────────────────────────

export function useQuizLoader() {
  const [loadingOverlay, setLoadingOverlay] = useState({ isOpen: false, progress: 0, status: '' })

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (loadingOverlay.isOpen && loadingOverlay.progress < 99) {
      interval = setInterval(() => {
        setLoadingOverlay(prev => {
          if (!prev.isOpen || prev.progress >= 99) return prev
          // Easing: fast at start, slows near 99
          const increment = (99 - prev.progress) * 0.12 + 0.3
          return { ...prev, progress: Math.min(99, prev.progress + increment) }
        })
      }, 50)
    }
    return () => clearInterval(interval)
  }, [loadingOverlay.isOpen, loadingOverlay.progress])

  const startLoading = useCallback((status: string) => {
    setLoadingOverlay({ isOpen: true, progress: 0, status })
  }, [])

  const completeLoading = useCallback((status: string = 'Hoàn tất!') => {
    setLoadingOverlay(prev => ({ ...prev, progress: 100, status }))
  }, [])

  const stopLoading = useCallback(() => {
    setLoadingOverlay({ isOpen: false, progress: 0, status: '' })
  }, [])

  const startContinuedLoading = useCallback((status: string) => {
    setLoadingOverlay({ isOpen: true, progress: 85, status })
  }, [])

  const updateStatus = useCallback((status: string) => {
    setLoadingOverlay(prev => ({ ...prev, status }))
  }, [])

  return {
    loadingOverlay,
    startLoading,
    completeLoading,
    stopLoading,
    startContinuedLoading,
    updateStatus,
  }
}

// ── Standalone hook for session pages (manages its own 0→100 animation) ──

export function useSessionLoader() {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Auto-increment from current progress toward 99
  useEffect(() => {
    if (!isOpen || progress >= 99) return
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 99) return prev
        return Math.min(99, prev + (99 - prev) * 0.1 + 0.4)
      })
    }, 50)
    return () => clearInterval(interval)
  }, [isOpen, progress])

  const open = useCallback((initialStatus: string) => {
    setProgress(0)
    setStatus(initialStatus)
    setIsOpen(true)
  }, [])

  const advance = useCallback((to: number, newStatus?: string) => {
    setProgress(prev => Math.max(prev, to))
    if (newStatus) setStatus(newStatus)
  }, [])

  const complete = useCallback(() => {
    setProgress(100)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setProgress(0)
  }, [])

  return { isOpen, progress, status, open, advance, complete, close, setStatus }
}

// ── Component ─────────────────────────────────────────────────────────────

export function QuizLoadingOverlay({
  isOpen,
  progress,
  status,
}: {
  isOpen: boolean
  progress: number
  status: string
}) {
  if (!isOpen) return null

  const pct = Math.min(100, Math.round(progress))

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#F9F9F7]/98 backdrop-blur-xl">
      <div className="w-full max-w-md px-8 text-center space-y-10 animate-in fade-in zoom-in duration-500">
        <div className="space-y-3">
          <h2 className="text-[10px] md:text-xs font-bold tracking-[0.3em] text-[#5D7B6F]/60 uppercase">
            {status || 'Đang xử lý'}
          </h2>
          <div className="relative w-full h-[2px] bg-[#5D7B6F]/10 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-[#5D7B6F] shadow-[0_0_8px_rgba(93,123,111,0.5)] transition-all duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="relative inline-block">
          <p className="text-6xl md:text-7xl font-light tracking-tighter text-[#5D7B6F] tabular-nums">
            {pct}
          </p>
          <span className="absolute -top-1 -right-4 text-sm font-medium text-[#5D7B6F]/40">%</span>
        </div>

        <p className="text-[10px] text-[#5D7B6F]/40 italic tracking-widest uppercase">
          Vui lòng đợi trong giây lát
        </p>
      </div>
    </div>
  )
}
