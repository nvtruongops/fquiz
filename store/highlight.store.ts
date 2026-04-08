import { create } from 'zustand'
import type { IUserHighlight } from '@/types/highlight'

type HighlightColor = '#B0D4B8' | '#D7F9FA' | '#FFE082' | '#EF9A9A'

interface HighlightState {
  // Highlights keyed by question_id
  highlights: Record<string, IUserHighlight[]>

  // Active color selection
  selectedColor: HighlightColor

  // Actions
  setHighlights: (questionId: string, highlights: IUserHighlight[]) => void
  addHighlight: (highlight: IUserHighlight) => void
  removeHighlight: (highlightId: string, questionId: string) => void
  setSelectedColor: (color: HighlightColor) => void
}

export const useHighlightStore = create<HighlightState>((set) => ({
  highlights: {},
  selectedColor: '#FFE082',

  setHighlights: (questionId, highlights) =>
    set((state) => ({
      highlights: { ...state.highlights, [questionId]: highlights },
    })),

  addHighlight: (highlight) =>
    set((state) => {
      const questionId = highlight.question_id.toString()
      const existing = state.highlights[questionId] ?? []
      return {
        highlights: { ...state.highlights, [questionId]: [...existing, highlight] },
      }
    }),

  removeHighlight: (highlightId, questionId) =>
    set((state) => {
      const existing = state.highlights[questionId] ?? []
      return {
        highlights: {
          ...state.highlights,
          [questionId]: existing.filter((h) => h._id.toString() !== highlightId),
        },
      }
    }),

  setSelectedColor: (color) => set({ selectedColor: color }),
}))
