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
  { key: '1', label: 'Quên bài', description: 'Again', className: 'bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20' },
  { key: '2', label: 'Khó', description: 'Hard', className: 'bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20' },
  { key: '3', label: 'Đã nhớ', description: 'Good', className: 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20' },
  { key: '4', label: 'Thuộc lỏng', description: 'Easy', className: 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20' },
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
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-white/80 backdrop-blur-2xl rounded-[32px] border border-white/90 shadow-sm max-w-md mx-auto space-y-4">
        <div className="text-5xl">🎉</div>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Hoàn thành phiên ôn tập!</h2>
        <p className="text-xs font-bold text-slate-400">Bạn đã ôn luyện xong {cards.length} thẻ ghi nhớ trong phiên này.</p>
        <button
          onClick={() => { setFinished(false); setIndex(0); setFlipped(false) }}
          className="px-6 py-3 bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-[#5D7B6F]/20 transition-all active:scale-[0.98]"
        >
          Ôn lại lần nữa
        </button>
      </div>
    )
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-white/80 backdrop-blur-2xl rounded-[32px] border border-white/90 shadow-sm max-w-md mx-auto space-y-3">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-black text-[#5D7B6F] uppercase tracking-tight">Tất cả đã hoàn thành!</h2>
        <p className="text-xs font-bold text-slate-400">Không có thẻ nào đến hạn ôn tập tại thời điểm này.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6" ref={containerRef}>
      <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400 px-2">
        <span>Thẻ {index + 1} / {cards.length}</span>
        {current.masteryLevel > 0 && (
          <span className="text-[#5D7B6F]">Độ nhớ: {current.masteryLevel}%</span>
        )}
        <span>Đã ôn: {current.reviewCount} lần</span>
      </div>

      <div
        className="relative cursor-pointer select-none rounded-[32px] overflow-hidden transition-all duration-300"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => setFlipped((f) => !f)}
        style={{ minHeight: '340px' }}
      >
        {/* Front Card */}
        <div
          className={`absolute inset-0 rounded-[32px] p-8 md:p-12 flex flex-col items-center justify-center text-center transition-all duration-500 bg-white/90 backdrop-blur-2xl border-2 border-white shadow-[0_12px_40px_rgba(0,0,0,0.05)] ${
            flipped ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5D7B6F] bg-[#5D7B6F]/10 px-3 py-1 rounded-full mb-4">
            {current.loType.toUpperCase()}
          </span>
          <p className="text-2xl md:text-3xl font-black text-slate-800 leading-snug whitespace-pre-wrap">{current.front}</p>
          <span className="mt-8 text-xs font-bold text-slate-400 animate-pulse">Nhấp hoặc nhấn Space để lật thẻ</span>
        </div>

        {/* Back Card */}
        <div
          className={`absolute inset-0 rounded-[32px] p-8 md:p-12 flex flex-col items-center justify-center text-center transition-all duration-500 bg-gradient-to-br from-emerald-50/90 via-white/90 to-emerald-50/60 backdrop-blur-2xl border-2 border-[#5D7B6F]/30 shadow-[0_16px_45px_rgba(93,123,111,0.12)] ${
            flipped ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full mb-4">
            ĐÁP ÁN & NGHĨA
          </span>
          <p className="text-xl md:text-2xl font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">{current.back}</p>
        </div>
      </div>

      {/* Grade Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {GRADE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => submitReview(opt.key)}
            disabled={submitting || !flipped}
            className={`py-3.5 px-3 rounded-2xl font-black text-white text-xs uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${opt.className}`}
          >
            <div className="text-sm font-black mb-0.5">Phím [{opt.key}]</div>
            <div>{opt.label}</div>
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] font-bold text-slate-400 pt-2">
        Nhấn phím 1-4 để đánh giá · Space để lật thẻ · Vuốt trái/phải trên màn hình cảm ứng
      </p>
    </div>
  )
}
