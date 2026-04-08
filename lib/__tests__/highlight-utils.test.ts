import {
  resolveHighlightLayers,
  toHighlightWords,
  HighlightSegment,
} from '../highlight-utils'

function makeSegment(
  overrides: Partial<HighlightSegment> & {
    _id: string
    offset: number
    text_segment: string
  }
): HighlightSegment {
  return {
    color_code: '#B0D4B8',
    created_at: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('resolveHighlightLayers', () => {
  it('returns empty array for empty input', () => {
    expect(resolveHighlightLayers([])).toEqual([])
  })

  it('returns single segment unchanged', () => {
    const seg = makeSegment({ _id: 'a', offset: 5, text_segment: 'hello' })
    const result = resolveHighlightLayers([seg])
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(seg)
  })

  it('returns all non-overlapping segments as-is', () => {
    const seg1 = makeSegment({ _id: 'a', offset: 0, text_segment: 'hello' })
    const seg2 = makeSegment({ _id: 'b', offset: 10, text_segment: 'world' })
    const seg3 = makeSegment({ _id: 'c', offset: 20, text_segment: 'foo' })

    const result = resolveHighlightLayers([seg1, seg2, seg3])
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual(seg1)
    expect(result[1]).toEqual(seg2)
    expect(result[2]).toEqual(seg3)
  })

  it('adjacent segments (no gap, no overlap) are both included', () => {
    // seg1 ends at offset 5, seg2 starts at offset 5 — no overlap
    const seg1 = makeSegment({ _id: 'a', offset: 0, text_segment: 'hello' })
    const seg2 = makeSegment({ _id: 'b', offset: 5, text_segment: 'world' })

    const result = resolveHighlightLayers([seg1, seg2])
    expect(result).toHaveLength(2)
  })

  it('LIFO: newer highlight wins over older when they overlap at same offset', () => {
    const older = makeSegment({
      _id: 'old',
      offset: 0,
      text_segment: 'hello world',
      created_at: new Date('2024-01-01T00:00:00Z'),
    })
    const newer = makeSegment({
      _id: 'new',
      offset: 0,
      text_segment: 'hello world',
      created_at: new Date('2024-01-02T00:00:00Z'),
    })

    // newer was created later → should win (appear first after sort)
    const result = resolveHighlightLayers([older, newer])
    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe('new')
  })

  it('fully contained older segment is skipped (LIFO)', () => {
    // newer covers offset 0–20, older covers offset 5–10 (fully inside newer)
    const newer = makeSegment({
      _id: 'newer',
      offset: 0,
      text_segment: 'abcdefghijklmnopqrst', // length 20
      created_at: new Date('2024-01-02T00:00:00Z'),
    })
    const older = makeSegment({
      _id: 'older',
      offset: 5,
      text_segment: 'fghij', // length 5, ends at 10 — fully inside newer
      created_at: new Date('2024-01-01T00:00:00Z'),
    })

    const result = resolveHighlightLayers([newer, older])
    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe('newer')
  })

  it('partial overlap: trims the overlapping prefix of the later-offset segment', () => {
    // seg1: offset 0, length 10 → covers [0, 10)
    // seg2: offset 5, length 10 → covers [5, 15), overlaps [5,10) with seg1
    // seg2 was created earlier, so after sort by offset, seg1 comes first
    // seg2's prefix [5,10) is trimmed → only [10,15) remains
    const seg1 = makeSegment({
      _id: 'seg1',
      offset: 0,
      text_segment: 'abcdefghij', // length 10
      created_at: new Date('2024-01-02T00:00:00Z'),
    })
    const seg2 = makeSegment({
      _id: 'seg2',
      offset: 5,
      text_segment: 'fghijklmno', // length 10, starts at 5
      created_at: new Date('2024-01-01T00:00:00Z'),
    })

    const result = resolveHighlightLayers([seg1, seg2])
    expect(result).toHaveLength(2)
    expect(result[0]._id).toBe('seg1')
    // trimmed segment starts at lastEnd (10), text is the last 5 chars of seg2
    expect(result[1].offset).toBe(10)
    expect(result[1].text_segment).toBe('klmno')
  })

  it('fully overlapped segment (not just prefix) is skipped entirely', () => {
    // seg1: offset 0, length 20
    // seg2: offset 5, length 5 → fully inside seg1 → skipped
    const seg1 = makeSegment({
      _id: 'seg1',
      offset: 0,
      text_segment: 'abcdefghijklmnopqrst', // length 20
      created_at: new Date('2024-01-02T00:00:00Z'),
    })
    const seg2 = makeSegment({
      _id: 'seg2',
      offset: 5,
      text_segment: 'fghij', // length 5, ends at 10 — fully inside seg1
      created_at: new Date('2024-01-01T00:00:00Z'),
    })

    const result = resolveHighlightLayers([seg1, seg2])
    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe('seg1')
  })

  it('sorts by offset ascending before resolving', () => {
    // Provide segments out of order — result should be sorted
    const seg1 = makeSegment({ _id: 'a', offset: 10, text_segment: 'world' })
    const seg2 = makeSegment({ _id: 'b', offset: 0, text_segment: 'hello' })

    const result = resolveHighlightLayers([seg1, seg2])
    expect(result).toHaveLength(2)
    expect(result[0]._id).toBe('b') // offset 0 first
    expect(result[1]._id).toBe('a') // offset 10 second
  })
})

describe('toHighlightWords', () => {
  it('returns empty array for empty input', () => {
    expect(toHighlightWords([])).toEqual([])
  })

  it('maps each segment to correct chunk format', () => {
    const seg = makeSegment({
      _id: 'a',
      offset: 5,
      text_segment: 'hello',
      color_code: '#FFE082',
    })

    const result = toHighlightWords([seg])
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      start: 5,
      end: 10, // offset + text_segment.length = 5 + 5
      highlight: true,
      color: '#FFE082',
    })
  })

  it('start equals offset and end equals offset + text_segment.length', () => {
    const seg = makeSegment({
      _id: 'b',
      offset: 3,
      text_segment: 'abcde', // length 5
      color_code: '#D7F9FA',
    })

    const [chunk] = toHighlightWords([seg])
    expect(chunk.start).toBe(3)
    expect(chunk.end).toBe(8)
  })

  it('highlight property is always true', () => {
    const seg = makeSegment({ _id: 'c', offset: 0, text_segment: 'test' })
    const [chunk] = toHighlightWords([seg])
    expect(chunk.highlight).toBe(true)
  })

  it('color maps from color_code', () => {
    const seg = makeSegment({
      _id: 'd',
      offset: 0,
      text_segment: 'x',
      color_code: '#EF9A9A',
    })
    const [chunk] = toHighlightWords([seg])
    expect(chunk.color).toBe('#EF9A9A')
  })

  it('maps multiple segments correctly', () => {
    const segments = [
      makeSegment({ _id: 'a', offset: 0, text_segment: 'foo', color_code: '#B0D4B8' }),
      makeSegment({ _id: 'b', offset: 10, text_segment: 'bar', color_code: '#D7F9FA' }),
    ]

    const result = toHighlightWords(segments)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ start: 0, end: 3, highlight: true, color: '#B0D4B8' })
    expect(result[1]).toEqual({ start: 10, end: 13, highlight: true, color: '#D7F9FA' })
  })
})
