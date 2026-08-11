'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * ponytail: Keyboard navigation hook currently built for multiple-choice quiz modes (immediate & review).
 * Uses Arrow keys (← → for prev/next question, ↑ ↓ for option focus) and Enter/Space for selection.
 * IF ESSAY/OPEN-ENDED (TỰ LUẬN) QUESTIONS ARE ADDED IN THE FUTURE: Ensure `isInput` guard below
 * or a question-type filter prevents arrow/enter keydown interception when the student is typing in input fields.
 */

interface UseQuizKeyboardNavigationOptions {
  currentIndex: number
  totalQuestions: number
  optionCount: number
  disabled?: boolean
  onNavigate: (index: number) => void
  onSelectOption: (optionIndex: number) => void
}

export function useQuizKeyboardNavigation({
  currentIndex,
  totalQuestions,
  optionCount,
  disabled = false,
  onNavigate,
  onSelectOption,
}: UseQuizKeyboardNavigationOptions) {
  const [focusedOption, setFocusedOption] = useState<number | null>(null)

  const onNavigateRef = useRef(onNavigate)
  const onSelectOptionRef = useRef(onSelectOption)
  onNavigateRef.current = onNavigate
  onSelectOptionRef.current = onSelectOption

  // Reset focused option whenever navigating to a new question
  useEffect(() => {
    setFocusedOption(null)
  }, [currentIndex])

  useEffect(() => {
    if (disabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is actively typing in an input, textarea, or contenteditable element (prevents text input bugs if essay/tự luận questions are added)
      const target = e.target as any
      const isInput =
        (typeof HTMLInputElement !== 'undefined' && target instanceof HTMLInputElement) ||
        (typeof HTMLTextAreaElement !== 'undefined' && target instanceof HTMLTextAreaElement) ||
        (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement && target.isContentEditable) ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA'

      if (isInput) return

      // Arrow navigation & Enter/Space selection ONLY (no 1-4 / A-D direct shortcuts)
      switch (e.key) {
        case 'ArrowLeft':
          if (currentIndex > 0) {
            e.preventDefault()
            onNavigateRef.current(currentIndex - 1)
          }
          break
        case 'ArrowRight':
          if (currentIndex < totalQuestions - 1) {
            e.preventDefault()
            onNavigateRef.current(currentIndex + 1)
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedOption((prev) => (prev === null ? optionCount - 1 : Math.max(0, prev - 1)))
          break
        case 'ArrowDown':
          e.preventDefault()
          setFocusedOption((prev) => (prev === null ? 0 : Math.min(optionCount - 1, prev + 1)))
          break
        case 'Enter':
        case ' ':
          if (focusedOption !== null) {
            e.preventDefault()
            onSelectOptionRef.current(focusedOption)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, totalQuestions, optionCount, disabled, focusedOption])

  return { focusedOption, setFocusedOption }
}
