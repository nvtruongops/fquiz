'use client'

import { useEffect, useRef, useState } from 'react'

interface HighlightToolbarProps {
  questionId: string
  existingHighlightCount: number
  onHighlight: (segment: { text_segment: string; offset: number; color_code: string }) => void
}

const COLORS = ['#B0D4B8', '#D7F9FA', '#FFE082', '#EF9A9A'] as const

export default function HighlightToolbar({
  questionId,
  existingHighlightCount,
  onHighlight,
}: HighlightToolbarProps) {
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null)
  const selectionRef = useRef<Selection | null>(null)

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
        setToolbarPos(null)
        selectionRef.current = null
        return
      }

      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      selectionRef.current = selection
      setToolbarPos({
        top: rect.top - 48 + window.scrollY,
        left: rect.left + rect.width / 2 - 60 + window.scrollX,
      })
    }

    const handleMouseDown = () => {
      setToolbarPos(null)
      selectionRef.current = null
    }

    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
        setToolbarPos(null)
        selectionRef.current = null
      }
    }

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('selectionchange', handleSelectionChange)

    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [questionId])

  const handleColorClick = (color: string) => {
    if (existingHighlightCount >= 10) return

    const selection = selectionRef.current ?? window.getSelection()
    if (!selection || selection.isCollapsed) return

    const text_segment = selection.toString().trim()
    if (!text_segment) return

    const range = selection.getRangeAt(0)
    const offset = range.startOffset

    onHighlight({ text_segment, offset, color_code: color })

    selection.removeAllRanges()
    setToolbarPos(null)
    selectionRef.current = null
  }

  if (!toolbarPos) return null

  return (
    <div
      className="fixed z-50 flex gap-2 items-center bg-white rounded-full shadow-lg px-3 py-2 border border-gray-200"
      style={{ top: toolbarPos.top, left: toolbarPos.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {COLORS.map((color) => (
        <button
          key={color}
          className="w-6 h-6 rounded-full border-2 border-white shadow cursor-pointer hover:scale-110 transition-transform"
          style={{ backgroundColor: color }}
          onClick={() => handleColorClick(color)}
          aria-label={`Highlight with color ${color}`}
        />
      ))}
    </div>
  )
}
