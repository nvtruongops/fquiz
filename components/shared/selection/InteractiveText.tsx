'use client'

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { VocabularyMatcher, TextSegment } from '@/lib/modules/learning/vocabulary-matcher'
import type { UserMatcherItem } from '@/app/api/v1/learning/vocabulary/user-matcher-list/route'
import { SelectionToolbar } from './SelectionToolbar'
import { QuickSaveVocabModal } from './QuickSaveVocabModal'
import { VocabPopover } from './VocabPopover'
import { useQuizSessionStore } from '@/store/quiz/quiz-session.store'
import { useAuth } from '@/hooks/auth/useAuth'

interface InteractiveTextProps {
  content: string
  className?: string
  sourceType?: 'quiz' | 'flashcard' | 'lesson'
  sourceId?: string
  enableHighlight?: boolean
  isNoteMode?: boolean
}

export function InteractiveText({
  content,
  className = '',
  sourceType = 'quiz',
  sourceId,
  enableHighlight = true,
  isNoteMode: isNoteModeProp,
}: InteractiveTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const { data: authData } = useAuth()
  const isDevOrAdmin = authData?.user?.role === 'dev' || authData?.user?.role === 'admin'
  const storeNoteMode = useQuizSessionStore((s) => s.isNoteMode)
  const rawNoteMode = sourceType === 'quiz'
    ? (isNoteModeProp !== undefined ? isNoteModeProp : storeNoteMode)
    : true
  const activeNoteMode = isDevOrAdmin && rawNoteMode

  useEffect(() => {
    setMounted(true)
  }, [])

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

  // State selection toolbar
  const [selectionState, setSelectionState] = useState<{
    text: string
    position: { top: number; bottom: number; left: number }
  } | null>(null)

  // State quick save modal
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [textToSave, setTextToSave] = useState('')

  // State popover xem từ vựng đã lưu
  const [activePopover, setActivePopover] = useState<{
    item: UserMatcherItem
    position: { top: number; left: number }
  } | null>(null)

  // Handle Bôi đen Text
  const handleMouseUp = useCallback(() => {
    // Chỉ kích hoạt bôi đen tra từ khi Bút Tra Từ (activeNoteMode) đang BẬT
    if (!activeNoteMode) {
      setSelectionState(null)
      return
    }

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const rawText = selection.toString().replace(/\s+/g, ' ').trim()
    if (rawText.length < 2 || rawText.length > 500) return

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    // Tự động đóng Bảng giải thích cũ khi học viên bôi đen chọn từ/cụm từ mới
    setActivePopover(null)

    setSelectionState({
      text: rawText,
      position: {
        top: rect.top,
        bottom: rect.bottom + 4,
        left: rect.left + rect.width / 2,
      },
    })
  }, [activeNoteMode])

  // Handle Quick Save Button
  const handleTriggerSave = () => {
    if (!selectionState) return
    setTextToSave(selectionState.text)
    setIsSaveModalOpen(true)
    setSelectionState(null)
  }

  // Handle Quick Lookup (Direct Translation Search with real API fetch)
  const handleTriggerLookup = async () => {
    if (!selectionState) return
    const targetText = selectionState.text
    const popoverPos = {
      top: selectionState.position.bottom,
      left: selectionState.position.left,
    }
    setSelectionState(null)

    try {
      const res = await fetch(`/api/v1/learning/vocabulary/lookup?q=${encodeURIComponent(targetText)}`)
      const data = await res.json()
      if (data?.success && data.item) {
        setActivePopover({
          item: {
            vocabularyId: 'temp',
            expression: targetText,
            normalizedExpression: targetText.toLowerCase(),
            display: data.item.display || targetText,
            translation: data.item.translation,
            ipa: data.item.ipa || undefined,
            partOfSpeech: data.item.partOfSpeech || undefined,
            reviewStatus: 'temp',
          },
          position: popoverPos,
        })
        return
      }
    } catch (err) {
      console.error('[InteractiveText] Lookup fetch error:', err)
    }

    // Fallback if network or lookup fails
    setActivePopover({
      item: {
        vocabularyId: 'temp',
        expression: targetText,
        normalizedExpression: targetText.toLowerCase(),
        display: targetText,
        translation: `Định nghĩa từ vựng "${targetText}". (Bấm "Lưu từ" để lưu vào Sổ từ vựng FSRS)`,
        reviewStatus: 'temp',
      },
      position: popoverPos,
    })
  }

  return (
    <span
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className={`interactive-text-container ${activeNoteMode ? 'select-text cursor-text' : 'select-none'} ${className}`}
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
              setSelectionState(null)
              const rect = e.currentTarget.getBoundingClientRect()
              setActivePopover({
                item,
                position: {
                  top: rect.bottom + 4,
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

      {/* Floating Selection Toolbar via React Portal */}
      {mounted && selectionState && createPortal(
        <SelectionToolbar
          selectedText={selectionState.text}
          position={selectionState.position}
          onSave={handleTriggerSave}
          onLookup={handleTriggerLookup}
          onClose={() => setSelectionState(null)}
        />,
        document.body
      )}

      {/* Hover/Click Vocab Popover via React Portal */}
      {mounted && activePopover && createPortal(
        <VocabPopover
          item={activePopover.item}
          position={activePopover.position}
          onClose={() => setActivePopover(null)}
        />,
        document.body
      )}

      {/* Quick Save Modal via React Portal */}
      {mounted && isSaveModalOpen && createPortal(
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
        />,
        document.body
      )}
    </span>
  )
}
