'use client'

import { useState } from 'react'
import { Sparkles, RotateCw, Volume2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'

export function InteractiveFlashcardPreview() {
  const [isFlipped, setIsFlipped] = useState(false)
  const [lastRating, setLastRating] = useState<string | null>(null)

  return (
    <div className="w-full space-y-4">
      {/* 3D Card Container */}
      <div 
        className="w-full h-60 perspective-1000 cursor-pointer select-none"
        onClick={() => setIsFlipped(!isFlipped)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsFlipped(!isFlipped)
          }
        }}
        tabIndex={0}
        role="button"
        aria-label="Interactive flashcard flip demo"
      >
        <div className={`flashcard-inner duration-500 ${isFlipped ? 'rotate-y-180' : ''}`}>
          {/* Front Face */}
          <div className="flashcard-face flashcard-face-front bg-card border border-border/80 shadow-md p-6 flex flex-col justify-between rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                Flashcard FSRS Engine
              </span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <RotateCw className="w-3.5 h-3.5" />
                <span>Chạm để lật</span>
              </div>
            </div>

            <div className="text-center my-auto space-y-1">
              <div className="flex items-center justify-center gap-2">
                <h4 className="text-2xl font-black text-foreground tracking-tight">Perseverance</h4>
                <Volume2 className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground font-mono">/ˌpɜː.sɪˈvɪə.rəns/</p>
            </div>

            <div className="text-center text-xs text-muted-foreground/80 font-medium">
              Thẻ nhớ thông minh theo đường cong quên (FSRS v4)
            </div>
          </div>

          {/* Back Face */}
          <div className="flashcard-face flashcard-face-back bg-card border border-primary/30 shadow-lg p-6 flex flex-col justify-between rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-success bg-success-bg/30 px-2.5 py-1 rounded-full border border-success/30">
                Định nghĩa & Ví dụ
              </span>
              <span className="text-xs text-muted-foreground">Đáp án</span>
            </div>

            <div className="space-y-2 my-auto text-center">
              <h5 className="text-lg font-black text-foreground">Sự kiên trì, bền chí</h5>
              <p className="text-xs text-muted-foreground italic leading-relaxed">
                &quot;Success requires hard work and continuous perseverance.&quot;
              </p>
            </div>

            {/* FSRS Rating Buttons Simulation */}
            <div className="grid grid-cols-4 gap-1.5 pt-2" onClick={(e) => e.stopPropagation()}>
              {[
                { label: 'Lặp lại', color: 'bg-destructive/10 text-destructive border-destructive/20' },
                { label: 'Khó', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
                { label: 'Tốt', color: 'bg-primary/10 text-primary border-primary/20' },
                { label: 'Dễ', color: 'bg-success-bg/30 text-success border-success/30' },
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => setLastRating(btn.label)}
                  className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-all hover:scale-105 active:scale-95 ${btn.color}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {lastRating && (
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-primary animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>Đã lưu thuật toán FSRS mức: <strong>{lastRating}</strong></span>
        </div>
      )}
    </div>
  )
}
