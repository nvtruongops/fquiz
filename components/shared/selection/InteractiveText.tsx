'use client'

import React from 'react'

interface InteractiveTextProps {
  content: string
  className?: string
  sourceType?: 'quiz' | 'flashcard' | 'lesson'
  sourceId?: string
  enableHighlight?: boolean
  isNoteMode?: boolean
}

export const InteractiveText = React.memo(function InteractiveText({
  content,
  className = '',
}: InteractiveTextProps) {
  return <span className={className}>{content}</span>
})
