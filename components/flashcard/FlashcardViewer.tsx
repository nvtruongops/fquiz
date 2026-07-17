'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

interface FlashcardItem {
  progressId: string
  front: string
  back: string
  loType: string
  learningObjectId: string
  version: number
  masteryLevel: number
  reviewCount: number
}

interface Props {
  initialCards: FlashcardItem[]
}

const GRADE_OPTIONS = [
  { key: '1', label: 'Again', description: 'Forgot', className: 'bg-red-500 hover:bg-red-600' },
  { key: '2', label: 'Hard', description: 'Difficult', className: 'bg-orange-500 hover:bg-orange-600' },
  { key: '3', label: 'Good', description: 'Correct', className: 'bg-green-500 hover:bg-green-600' },
  { key: '4', label: 'Easy', description: 'Trivial', className: 'bg-blue-500 hover:bg-blue-600' },
]

const GRADE_MAP: Record<string, string> = {
  '1': 'incorrect',
  '2': 'partial',
  '3': 'correct',
  '4': 'correct',
}

export default function FlashcardViewer({ initialCards }: Props) {
  const [cards, setCards] = useState<FlashcardItem[]>(initialCards)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [finished, setFinished] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const current = cards[index]

  const submitReview = useCallback(async (grade: string) => {
    if (!current || submitting) return
    setSubmitting(true)

    const result = GRADE_MAP[grade] ?? 'correct'

    try {
      await fetch('/api/v1/learning/review/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learningObjectId: current.learningObjectId,
          loType: current.loType,
          version: current.version,
          result,
          strategy: 'fsrs',
        }),
      })
    } catch {
      // Silently fail — review will be retried next load
    }

    setSubmitting(false)
    setFlipped(false)

    if (index < cards.length - 1) {
      setIndex((i) => i + 1)
    } else if (cards.length <= 1) {
      setFinished(true)
    } else {
      setCards((prev) => {
        const next = [...prev]
        const removed = next.splice(index, 1)
        if (next.length === 0) {
          setFinished(true)
        }
        return next
      })
    }
  }, [current, submitting, index, cards.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '4') {
        submitReview(e.key)
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped((f) => !f)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [submitReview])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      if (flipped) {
        submitReview(dx > 0 ? '4' : '1')
      }
    } else if (Math.abs(dy) > 60) {
      setFlipped((f) => !f)
    }
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">Session Complete</h2>
        <p className="text-gray-400 mb-6">You reviewed {cards.length} card{cards.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => { setFinished(false); setIndex(0); setFlipped(false) }}
          className="px-6 py-3 bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Review Again
        </button>
      </div>
    )
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-2">All caught up!</h2>
        <p className="text-gray-400">No flashcards due for review right now.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto" ref={containerRef}>
      <div className="text-sm text-gray-400 text-center mb-4">
        Card {index + 1} of {cards.length}
        {current.masteryLevel > 0 && (
          <span className="ml-4">Mastery: {current.masteryLevel}%</span>
        )}
        <span className="ml-4">Reviews: {current.reviewCount}</span>
      </div>

      <div
        className="relative cursor-pointer select-none mb-8"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => setFlipped((f) => !f)}
        style={{ minHeight: '320px' }}
      >
        <div
          className={`absolute inset-0 rounded-2xl p-8 flex items-center justify-center text-center transition-all duration-500 ${
            flipped
              ? 'opacity-0 pointer-events-none'
              : 'opacity-100 bg-white/5 border border-white/10'
          }`}
        >
          <p className="text-2xl font-medium whitespace-pre-wrap">{current.front}</p>
        </div>
        <div
          className={`absolute inset-0 rounded-2xl p-8 flex items-center justify-center text-center transition-all duration-500 ${
            flipped
              ? 'opacity-100 bg-indigo-600/10 border border-indigo-500/30'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          <p className="text-xl whitespace-pre-wrap">{current.back}</p>
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        {GRADE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => submitReview(opt.key)}
            disabled={submitting || !flipped}
            className={`flex-1 max-w-[140px] py-3 rounded-xl font-medium text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed ${opt.className}`}
          >
            <div className="text-sm">{opt.key}</div>
            <div className="text-xs opacity-80">{opt.label}</div>
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-gray-500 mt-6">
        Tap card to flip · Keyboard 1-4 to grade · Swipe left=Again right=Easy
      </p>
    </div>
  )
}
