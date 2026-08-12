import type { UserMatcherItem } from '@/app/api/v1/learning/vocabulary/user-matcher-list/route'

export interface MatchedSpanInfo {
  start: number
  end: number
  matchedText: string
  item: UserMatcherItem
}

export interface TextSegment {
  text: string
  isMatched: boolean
  matchedItem?: UserMatcherItem
}

function findMatchesForItem(
  text: string,
  item: UserMatcherItem,
  existingMatches: MatchedSpanInfo[]
): void {
  const target = item.normalizedExpression || item.expression.toLowerCase().trim()
  if (!target) return

  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // eslint-disable-next-line security/detect-non-literal-regexp
  const regex = new RegExp(`\\b${escaped}\\b`, 'gi')

  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const start = match.index
    const end = start + match[0].length

    const isOverlapping = existingMatches.some(
      (m) => !(end <= m.start || start >= m.end)
    )

    if (!isOverlapping) {
      existingMatches.push({ start, end, matchedText: match[0], item })
    }
  }
}

function buildSegments(text: string, matches: MatchedSpanInfo[]): TextSegment[] {
  matches.sort((a, b) => a.start - b.start)
  const segments: TextSegment[] = []
  let cursor = 0

  for (const m of matches) {
    if (m.start > cursor) {
      segments.push({ text: text.slice(cursor, m.start), isMatched: false })
    }
    segments.push({ text: text.slice(m.start, m.end), isMatched: true, matchedItem: m.item })
    cursor = m.end
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), isMatched: false })
  }

  return segments
}

export class VocabularyMatcher {
  /**
   * Khớp danh sách từ vựng/cụm từ của User với văn bản đầu vào.
   * Ưu tiên cụm từ dài nhất trước (Greedy Longest Match First).
   */
  static parse(text: string, items: UserMatcherItem[]): TextSegment[] {
    if (!text || !items || items.length === 0) {
      return [{ text: text || '', isMatched: false }]
    }

    const sortedItems = [...items].sort((a, b) => b.expression.length - a.expression.length)
    const matches: MatchedSpanInfo[] = []

    for (const item of sortedItems) {
      findMatchesForItem(text, item, matches)
    }

    if (matches.length === 0) {
      return [{ text, isMatched: false }]
    }

    return buildSegments(text, matches)
  }
}
