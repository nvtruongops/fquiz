'use client'

import type { IUserHighlight } from '@/types/highlight'
import { resolveHighlightLayers, type HighlightSegment } from '@/lib/highlight-utils'
import HighlightToolbar from './HighlightToolbar'

interface QuestionTextProps {
  text: string
  questionId: string
  highlights: IUserHighlight[]
  onAddHighlight: (segment: { text_segment: string; offset: number; color_code: string }) => void
  highlightCount: number
}

export default function QuestionText({
  text,
  questionId,
  highlights,
  onAddHighlight,
  highlightCount,
}: QuestionTextProps) {
  const segments: HighlightSegment[] = highlights.map((h) => ({
    _id: h._id.toString(),
    offset: h.offset,
    text_segment: h.text_segment,
    color_code: h.color_code,
    created_at: h.created_at,
  }))

  const resolved = resolveHighlightLayers(segments)

  const spans: React.ReactNode[] = []
  let cursor = 0

  for (const segment of resolved) {
    if (segment.offset > cursor) {
      spans.push(
        <span key={`plain-${cursor}`}>{text.slice(cursor, segment.offset)}</span>
      )
    }
    spans.push(
      <span
        key={`highlight-${segment._id}`}
        style={{ backgroundColor: segment.color_code }}
      >
        {segment.text_segment}
      </span>
    )
    cursor = segment.offset + segment.text_segment.length
  }

  if (cursor < text.length) {
    spans.push(<span key={`plain-end`}>{text.slice(cursor)}</span>)
  }

  return (
    <div className="relative select-text text-base leading-relaxed">
      {spans}
      <HighlightToolbar
        questionId={questionId}
        existingHighlightCount={highlightCount}
        onHighlight={onAddHighlight}
      />
    </div>
  )
}
