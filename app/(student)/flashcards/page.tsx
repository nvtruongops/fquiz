'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import FlashcardViewer from '@/components/flashcard/FlashcardViewer'

interface FlashcardItem {
  progressId: string
  front: string
  back: string
  loType: string
  learningObjectId: string
  version: number
  masteryLevel: number
  reviewCount: number
  nextReviewAt: string | null
  retrievability?: number
}

export default function FlashcardsPage() {
  const [loFilter, setLoFilter] = useState<string>('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['flashcards-due', loFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' })
      if (loFilter) params.set('loType', loFilter)
      const res = await fetch(`/api/v1/learning/review/due?${params}`)
      if (!res.ok) throw new Error('Failed to fetch due flashcards')
      return res.json() as Promise<{ items: FlashcardItem[]; total: number }>
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const items = data?.items ?? []
  const total = data?.total ?? 0

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Flashcard Review</h1>
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-semibold mb-2">All reviewed!</h2>
          <p className="text-gray-400 mb-4">No flashcards due for review right now.</p>
          <p className="text-xs text-gray-500">
            {total === 0 ? 'Start learning new vocabulary, sentences, or grammar to build your flashcards.' : ''}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-6 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Flashcard Review</h1>
        <div className="flex items-center gap-3">
          <select
            value={loFilter}
            onChange={(e) => setLoFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">All Types</option>
            <option value="vocabulary">Vocabulary</option>
            <option value="sentence">Sentences</option>
            <option value="grammar">Grammar</option>
          </select>
          <span className="text-sm text-gray-400">
            {items.length} due
          </span>
        </div>
      </div>

      <FlashcardViewer initialCards={items} />
    </div>
  )
}
