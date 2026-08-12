'use client'

import React, { useState, useRef, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { VocabularyMatcher, TextSegment } from '@/lib/modules/learning/vocabulary-matcher'
import type { UserMatcherItem } from '@/app/api/v1/learning/vocabulary/user-matcher-list/route'
import { SelectionToolbar } from './SelectionToolbar'
import { QuickSaveVocabModal } from './QuickSaveVocabModal'
import { VocabPopover } from './VocabPopover'

interface InteractiveTextProps {
  content: string
  className?: string
  sourceType?: 'quiz' | 'flashcard' | 'lesson'
  sourceId?: string
  enableHighlight?: boolean
}

export function InteractiveText({
  content,
  className = '',
  sourceType = 'quiz',
  sourceId,
  enableHighlight = true,
}: InteractiveTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // 1. Fetch user matcher items (User's saved vocab list)
  const { data, refetch } = useQuery<{ items: UserMatcherItem[] }>({
    queryKey: ['user-matcher-list'],
    queryFn: async () => {
      const res = await fetch('/api/v1/learning/vocabulary/user-matcher-list')
      if (!res.ok) return { items: [] }
      return res.json()
    },
    staleTime: 1000 * 60 * 5, // Cache 5 min
  })

  const userVocabs = useMemo(() => data?.items || [], [data?.items])

  // 2. Parse text with VocabularyMatcher
  const segments: TextSegment[] = useMemo(() => {
    if (!enableHighlight || !content || userVocabs.length === 0) {
      return [{ text: content || '', isMatched: false }]
    }
    return VocabularyMatcher.parse(content, userVocabs)
  }, [content, userVocabs, enableHighlight])

  // 3. Selection State
  const [selectionState, setSelectionState] = useState<{
    text: string
    position: { top: number; left: number }
  } | null>(null)

  // 4. Active Popover State (for hovering / clicking on matched vocab)
  const [activePopover, setActivePopover] = useState<{
    item: UserMatcherItem
    position: { top: number; left: number }
  } | null>(null)

  // 5. Quick Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [textToSave, setTextToSave] = useState('')

  // Handle Mouse Selection
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      return
    }

    const selectedStr = selection.toString().trim()
    if (selectedStr.length < 2) return

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    setSelectionState({
      text: selectedStr,
      position: {
        top: rect.top,
        left: rect.left + rect.width / 2,
      },
    })
  }, [])

  // Handle Quick Save Button
  const handleTriggerSave = () => {
    if (!selectionState) return
    setTextToSave(selectionState.text)
    setIsSaveModalOpen(true)
    setSelectionState(null)
  }

  // Handle Quick Lookup (Direct Translation Search)
  const handleTriggerLookup = () => {
    if (!selectionState) return
    // Show quick lookup popover or alert
    setActivePopover({
      item: {
        vocabularyId: 'temp',
        expression: selectionState.text,
        normalizedExpression: selectionState.text.toLowerCase(),
        display: selectionState.text,
        translation: 'Tra từ nhanh (Chưa lưu vào FSRS)',
        reviewStatus: 'saved',
      },
      position: selectionState.position,
    })
    setSelectionState(null)
  }

  return (
    <span
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className={`inline-block relative ${className}`}
    >
      {segments.map((seg, idx) => {
        if (!seg.isMatched || !seg.matchedItem) {
          return <span key={idx}>{seg.text}</span>
        }

        const item = seg.matchedItem
        const isNeedsReview = item.reviewStatus === 'needs_review'

        return (
          <span
            key={idx}
            onClick={(e) => {
              e.stopPropagation()
              const rect = e.currentTarget.getBoundingClientRect()
              setActivePopover({
                item,
                position: {
                  top: rect.bottom,
                  left: rect.left + rect.width / 2,
                },
              })
            }}
            className={`cursor-pointer transition-all duration-150 rounded px-0.5 ${
              isNeedsReview
                ? 'border-b-2 border-amber-500/80 bg-amber-500/15 text-amber-900 dark:text-amber-200 font-medium hover:bg-amber-500/25'
                : 'border-b border-dashed border-primary/50 text-primary font-medium hover:bg-primary/10'
            }`}
            title={`Bấm để xem nghĩa từ vựng: ${item.expression}`}
          >
            {seg.text}
          </span>
        )
      })}

      {/* Floating Selection Toolbar */}
      {selectionState && (
        <SelectionToolbar
          selectedText={selectionState.text}
          position={selectionState.position}
          onSave={handleTriggerSave}
          onLookup={handleTriggerLookup}
          onClose={() => setSelectionState(null)}
        />
      )}

      {/* Hover/Click Vocab Popover */}
      {activePopover && (
        <VocabPopover
          item={activePopover.item}
          position={activePopover.position}
          onClose={() => setActivePopover(null)}
        />
      )}

      {/* Quick Save Modal */}
      <QuickSaveVocabModal
        isOpen={isSaveModalOpen}
        expression={textToSave}
        contextSentence={
          content && textToSave
            ? content.split(/(?<=[.!?])\s+/).find((s) => s.toLowerCase().includes(textToSave.toLowerCase()))?.trim() || content.trim()
            : content
        }
        sourceType={sourceType}
        sourceId={sourceId}
        onClose={() => setIsSaveModalOpen(false)}
        onSavedSuccess={() => {
          refetch()
        }}
      />
    </span>
  )
}
