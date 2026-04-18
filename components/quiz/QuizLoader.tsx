'use client'

import { useState, useEffect } from 'react'

export function useQuizLoader() {
  const [loadingOverlay, setLoadingOverlay] = useState({ isOpen: false, progress: 0, status: '' })

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (loadingOverlay.isOpen && loadingOverlay.progress < 95) {
      interval = setInterval(() => {
        setLoadingOverlay(prev => {
          if (prev.progress >= 95) return prev
          return { ...prev, progress: prev.progress + (95 - prev.progress) * 0.15 + 0.5 }
        })
      }, 50)
    }
    return () => clearInterval(interval)
  }, [loadingOverlay.isOpen, loadingOverlay.progress])

  const startLoading = (status: string) => {
    setLoadingOverlay({ isOpen: true, progress: 0, status })
  }

  const completeLoading = (status: string = 'Hoàn tất!') => {
    setLoadingOverlay(prev => ({ ...prev, progress: 100, status }))
  }

  const stopLoading = () => {
    setLoadingOverlay({ isOpen: false, progress: 0, status: '' })
  }

  const startContinuedLoading = (status: string) => {
    setLoadingOverlay({ isOpen: true, progress: 85, status })
  }

  return {
    loadingOverlay,
    startLoading,
    completeLoading,
    stopLoading,
    startContinuedLoading
  }
}

export function QuizLoadingOverlay({
  isOpen,
  progress,
  status
}: {
  isOpen: boolean
  progress: number
  status: string
}) {
  if (!isOpen) return null

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
              style={{ width: `${Math.min(100, Math.round(progress))}%` }}
            />
          </div>
        </div>
        
        <div className="relative inline-block">
          <p className="text-6xl md:text-7xl font-light tracking-tighter text-[#5D7B6F] tabular-nums">
            {Math.min(100, Math.round(progress))}
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
