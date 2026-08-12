import { VocabularyMatcher } from '../vocabulary-matcher'
import type { UserMatcherItem } from '@/app/api/v1/learning/vocabulary/user-matcher-list/route'

describe('VocabularyMatcher', () => {
  const mockItems: UserMatcherItem[] = [
    {
      vocabularyId: '1',
      expression: 'take',
      normalizedExpression: 'take',
      display: 'take',
      reviewStatus: 'saved',
    },
    {
      vocabularyId: '2',
      expression: 'take part',
      normalizedExpression: 'take part',
      display: 'take part',
      reviewStatus: 'saved',
    },
    {
      vocabularyId: '3',
      expression: 'take part in the discussion',
      normalizedExpression: 'take part in the discussion',
      display: 'take part in the discussion',
      reviewStatus: 'needs_review',
    },
    {
      vocabularyId: '4',
      expression: 'struggling to maintain',
      normalizedExpression: 'struggling to maintain',
      display: 'struggling to maintain',
      reviewStatus: 'needs_review',
    },
    {
      vocabularyId: '5',
      expression: 'machine learning',
      normalizedExpression: 'machine learning',
      display: 'machine learning',
      reviewStatus: 'saved',
    },
  ]

  it('should match longest phrase first and avoid overlapping', () => {
    const text = 'The company is struggling to maintain its growth and decided to take part in the discussion today.'
    const segments = VocabularyMatcher.parse(text, mockItems)

    expect(segments.length).toBe(5)
    expect(segments[0]).toEqual({ text: 'The company is ', isMatched: false })
    expect(segments[1].isMatched).toBe(true)
    expect(segments[1].matchedItem?.expression).toBe('struggling to maintain')
    expect(segments[2]).toEqual({ text: ' its growth and decided to ', isMatched: false })
    expect(segments[3].isMatched).toBe(true)
    expect(segments[3].matchedItem?.expression).toBe('take part in the discussion')
    expect(segments[4]).toEqual({ text: ' today.', isMatched: false })
  })

  it('should be case-insensitive (uppercase / lowercase)', () => {
    const text = 'MACHINE LEARNING is a powerful tool in modern software.'
    const segments = VocabularyMatcher.parse(text, mockItems)

    expect(segments.length).toBe(2)
    expect(segments[0].isMatched).toBe(true)
    expect(segments[0].text).toBe('MACHINE LEARNING')
    expect(segments[0].matchedItem?.expression).toBe('machine learning')
  })

  it('should match phrases at the very beginning and very end of text', () => {
    const text = 'Take part in the discussion now and take part'
    const segments = VocabularyMatcher.parse(text, mockItems)

    expect(segments[0].isMatched).toBe(true)
    expect(segments[0].text).toBe('Take part in the discussion')
    expect(segments[segments.length - 1].isMatched).toBe(true)
    expect(segments[segments.length - 1].text).toBe('take part')
  })

  it('should match multiple occurrences of the same phrase in a single text', () => {
    const text = 'Machine learning is useful. Machine learning is everywhere.'
    const segments = VocabularyMatcher.parse(text, mockItems)

    const matchedSegments = segments.filter((s) => s.isMatched)
    expect(matchedSegments.length).toBe(2)
    expect(matchedSegments[0].text).toBe('Machine learning')
    expect(matchedSegments[1].text).toBe('Machine learning')
  })

  it('should match phrase adjacent to punctuation marks correctly', () => {
    const text = 'With "machine learning," we can automate tasks.'
    const segments = VocabularyMatcher.parse(text, mockItems)

    const matched = segments.find((s) => s.isMatched)
    expect(matched).toBeDefined()
    expect(matched?.text).toBe('machine learning')
  })

  it('should return unmatched full text if no items match', () => {
    const text = 'Hello world this is a test'
    const segments = VocabularyMatcher.parse(text, mockItems)

    expect(segments).toEqual([{ text: 'Hello world this is a test', isMatched: false }])
  })
})
