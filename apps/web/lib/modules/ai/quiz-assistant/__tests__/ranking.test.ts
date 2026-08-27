import {
  RANKING_WEIGHTS,
  MIN_RELEVANCE_SCORE,
  computeOptionMatch,
  calculateRelevanceScore,
  calculateRelevanceBreakdown,
  rankRetrievalCandidates,
  tokenize,
} from '../retrieval/ranking'
import type { RetrievalResult } from '../retrieval/retrieval-types'

describe('Ranking Engine & Weight Invariant Tests (Deep Calibration)', () => {
  it('INVARIANT: sum(RANKING_WEIGHTS) must equal 1.0', () => {
    const sum =
      RANKING_WEIGHTS.optionMatch +
      RANKING_WEIGHTS.questionMatch +
      RANKING_WEIGHTS.subjectMatch
    expect(Number(sum.toFixed(6))).toBe(1.0)
  })

  it('INVARIANT: MIN_RELEVANCE_SCORE must be within [0.0, 1.0] and set to 0.65', () => {
    expect(MIN_RELEVANCE_SCORE).toBe(0.65)
  })

  it('tokenize should return set of clean lowercase words', () => {
    const tokens = tokenize('Which of the following is correct? A. Test')
    expect(tokens.has('which')).toBe(true)
    expect(tokens.has('following')).toBe(true)
    expect(tokens.has('correct')).toBe(true)
    expect(tokens.has('test')).toBe(true)
  })

  it('computeOptionMatch should return 1.0 for exact matches', () => {
    const score = computeOptionMatch('Communication Plan', ['A. Scope', 'B. Communication Plan'], 1)
    expect(score).toBe(1.0)
  })

  it('computeOptionMatch should penalize partial token overlaps (e.g. Matrix vs Responsibility Assignment Matrix)', () => {
    const score = computeOptionMatch('Matrix', ['A. Scope', 'B. Responsibility Assignment Matrix'], 1)
    // 1 token overlap out of 3 tokens -> 1/3 ~ 0.333
    expect(score).toBeLessThan(0.40)
    expect(score).toBeGreaterThan(0.25)
  })

  it('computeOptionMatch should return 0.0 when no match exists', () => {
    const score = computeOptionMatch('Database Migration', ['A. Agile', 'B. Scrum'], 0)
    expect(score).toBe(0)
  })

  it('calculateRelevanceBreakdown should return structured scores and matchedAnswerText', () => {
    const breakdown = calculateRelevanceBreakdown({
      candidate: {
        text: 'What is risk management in planning?',
        options: ['A. Identifying risks', 'B. Ignoring risks'],
        correctAnswer: 0,
        metadata: { categoryId: 'cat-1', courseCode: 'PMG201C' },
      },
      currentQuestionText: 'What is risk management in project planning?',
      targetOptionText: 'Identifying risks',
      categoryId: 'cat-1',
      courseCode: 'PMG201C',
    })

    expect(breakdown.totalScore).toBeGreaterThanOrEqual(0.65)
    expect(breakdown.optionScore).toBe(1.0)
    expect(breakdown.subjectScore).toBe(1.0)
    expect(breakdown.matchedAnswerText).toBe('Identifying risks')
  })

  it('INVARIANT: Deterministic Ranking - same input yields exact same score and ordering', () => {
    const candidates: RetrievalResult[] = [
      {
        id: 'cand-1',
        sourceType: 'question_bank',
        sourceId: '1',
        content: 'Q1',
        score: 0.85,
        metadata: {},
      },
      {
        id: 'cand-2',
        sourceType: 'question_bank',
        sourceId: '2',
        content: 'Q2',
        score: 0.95,
        metadata: {},
      },
      {
        id: 'cand-3',
        sourceType: 'quiz',
        sourceId: '3',
        content: 'Q3',
        score: 0.55, // Below MIN_RELEVANCE_SCORE (0.65)
        metadata: {},
      },
    ]

    const ranked1 = rankRetrievalCandidates(candidates, 2)
    const ranked2 = rankRetrievalCandidates(candidates, 2)

    expect(ranked1.length).toBe(2)
    expect(ranked1[0].id).toBe('cand-2') // highest score 0.95
    expect(ranked1[1].id).toBe('cand-1') // second highest 0.85
    expect(ranked1).toEqual(ranked2)
  })

  it('should filter out candidates below MIN_RELEVANCE_SCORE (0.65)', () => {
    const candidates: RetrievalResult[] = [
      {
        id: 'cand-weak-1',
        sourceType: 'question_bank',
        sourceId: '1',
        content: 'Weak candidate 1',
        score: 0.62,
        metadata: {},
      },
      {
        id: 'cand-weak-2',
        sourceType: 'quiz',
        sourceId: '2',
        content: 'Weak candidate 2',
        score: 0.48,
        metadata: {},
      },
    ]

    const ranked = rankRetrievalCandidates(candidates, 2)
    expect(ranked).toEqual([]) // Both filtered out because score < 0.65
  })

  it('BOOLEAN CONTEXT GATE: True/False questions with completely different topics (e.g. Budget vs Baseline) must be filtered out', () => {
    const breakdown = calculateRelevanceBreakdown({
      candidate: {
        text: 'True or False: The Project Budget is equal to only the Cost Baseline budget.',
        options: ['A. True', 'B. False'],
        correctAnswer: 1, // False
        metadata: { categoryId: 'cat-1', courseCode: 'PMG201C' },
      },
      currentQuestionText: 'True or False: You should compare your project performance against the performance measurement baseline to look for potential changes in the project.',
      targetOptionText: 'False',
      categoryId: 'cat-1',
      courseCode: 'PMG201C',
    })
    // Assert that option score was gated to 0 due to low question context overlap (< 0.20), failing MIN_RELEVANCE_SCORE
    expect(breakdown.optionScore).toBe(0)
    expect(breakdown.totalScore).toBeLessThan(MIN_RELEVANCE_SCORE)
  })

  it('HARD SUBJECT GATE: Candidates from a different subject must be rejected immediately (totalScore = 0)', () => {
    const breakdown = calculateRelevanceBreakdown({
      candidate: {
        text: 'What is a communication management plan in project?',
        options: ['A. Scope', 'B. Communication Plan'],
        correctAnswer: 1,
        metadata: { categoryId: 'cat-foreign', courseCode: 'CS101' },
      },
      currentQuestionText: 'What is a communication management plan in project?',
      targetOptionText: 'Communication Plan',
      categoryId: 'cat-authoritative-pmg',
      courseCode: 'PMG201C',
    })

    // Assert Hard Rejection
    expect(breakdown.totalScore).toBe(0)
    expect(breakdown.subjectScore).toBe(0)
  })
})
