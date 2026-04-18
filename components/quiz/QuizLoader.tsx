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
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#F9F9F7]/95 backdrop-blur-md">
      <div className="w-full max-w-md px-8 text-center space-y-6">
        <h2 className="text-sm md:text-base font-semibold tracking-[0.2em] text-[#5D7B6F] uppercase animate-pulse">
          {status}
        </h2>
        
        <div className="relative w-full h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full bg-[#5D7B6F] transition-all duration-100 ease-out"
            style={{ width: `${Math.min(100, Math.round(progress))}%` }}
          />
        </div>
        
        <p className="text-4xl md:text-5xl font-light tracking-tighter text-[#5D7B6F]">
          {Math.min(100, Math.round(progress))}%
        </p>
      </div>
    </div>
  )
}
