'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

interface QuizTimerProps {
  startedAt: string | Date
  pausedAt?: string | Date | null
  totalPausedDurationMs?: number
  className?: string
}

export function QuizTimer({ 
  startedAt, 
  pausedAt, 
  totalPausedDurationMs = 0,
  className = ''
}: QuizTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    const startTime = new Date(startedAt).getTime()
    
    const updateTimer = () => {
      const now = Date.now()
      
      // If paused, calculate time up to pause point
      if (pausedAt) {
        const pauseTime = new Date(pausedAt).getTime()
        const elapsed = pauseTime - startTime - totalPausedDurationMs
        setElapsedSeconds(Math.floor(elapsed / 1000))
        return
      }
      
      // Active: calculate current elapsed time minus paused duration
      const elapsed = now - startTime - totalPausedDurationMs
      setElapsedSeconds(Math.floor(elapsed / 1000))
    }

    // Update immediately
    updateTimer()
    
    // Update every second if not paused
    if (!pausedAt) {
      const interval = setInterval(updateTimer, 1000)
      return () => clearInterval(interval)
    }
  }, [startedAt, pausedAt, totalPausedDurationMs])

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Clock className="h-4 w-4" />
      <span className="font-mono text-sm font-medium">
        {formatTime(elapsedSeconds)}
      </span>
    </div>
  )
}
