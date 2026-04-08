export interface HighlightSegment {
  _id: string
  offset: number
  text_segment: string
  color_code: string
  created_at: Date
}

/**
 * Sorts highlights by offset ascending.
 * For overlapping segments, applies LIFO (Last In, First Out):
 * the more recently created highlight wins.
 *
 * Returns a clean, non-overlapping array ready for react-highlight-words.
 */
export function resolveHighlightLayers(
  highlights: HighlightSegment[]
): HighlightSegment[] {
  // Sort by offset asc; for same offset, newest first (LIFO)
  const sorted = [...highlights].sort((a, b) => {
    if (a.offset !== b.offset) return a.offset - b.offset
    return b.created_at.getTime() - a.created_at.getTime()
  })

  const resolved: HighlightSegment[] = []
  let lastEnd = -1

  for (const segment of sorted) {
    const segEnd = segment.offset + segment.text_segment.length

    if (segment.offset >= lastEnd) {
      // No overlap — include as-is
      resolved.push(segment)
      lastEnd = segEnd
    } else if (segEnd > lastEnd) {
      // Partial overlap — trim the overlapping prefix
      const trimStart = lastEnd - segment.offset
      const trimmedText = segment.text_segment.slice(trimStart)
      if (trimmedText.length > 0) {
        resolved.push({
          ...segment,
          offset: lastEnd,
          text_segment: trimmedText,
        })
        lastEnd = lastEnd + trimmedText.length
      }
      // else fully overlapped — skip
    }
    // else fully contained within previous — skip (LIFO: newer already included)
  }

  return resolved
}

/**
 * Converts resolved HighlightSegments to chunk format for react-highlight-words.
 */
export function toHighlightWords(
  segments: HighlightSegment[]
): Array<{ start: number; end: number; highlight: boolean; color: string }> {
  return segments.map((s) => ({
    start: s.offset,
    end: s.offset + s.text_segment.length,
    highlight: true,
    color: s.color_code,
  }))
}
