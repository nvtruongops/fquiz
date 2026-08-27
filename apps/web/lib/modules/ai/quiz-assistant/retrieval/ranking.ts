import type { RetrievalResult, RelevanceScoreBreakdown } from './retrieval-types'

export const RANKING_WEIGHTS = {
  optionMatch: 0.35,
  questionMatch: 0.35,
  subjectMatch: 0.30,
} as const

export const MIN_RELEVANCE_SCORE = 0.65

/**
 * Strips exam boilerplate prefixes (e.g. "True or False:", "Choose the correct answer:")
 */
export function cleanQuestionText(text: string): string {
  if (!text) return ''
  return text
    .replace(/^(?:true\s+or\s+false|true\/false|choose\s+the\s+correct\s+answer)\s*[:\.\-]?\s*/i, '')
    .trim()
}

/**
 * Tokenize string into lowercase alphanumeric word tokens
 */
export function tokenize(str: string): Set<string> {
  if (!str) return new Set()
  const clean = str.toLowerCase().replace(/[^\w\s\u00C0-\u1EF9]/g, ' ')
  return new Set(clean.split(/\s+/).filter((t) => t.length > 1))
}

/**
 * Compute Jaccard coefficient between two token sets -> [0.0, 1.0]
 */
export function computeTokenOverlap(tokensA: Set<string>, tokensB: Set<string>): number {
  if (tokensA.size === 0 || tokensB.size === 0) return 0
  let intersection = 0
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++
  }
  const union = tokensA.size + tokensB.size - intersection
  return union > 0 ? intersection / union : 0
}

/**
 * Compute option match score [0.0, 1.0] and extract matched option text
 */
export function computeOptionMatchWithText(
  targetOptionText: string,
  candidateOptions: string[],
  candidateCorrect: number | number[]
): { score: number; matchedText?: string } {
  if (!targetOptionText || !Array.isArray(candidateOptions) || candidateOptions.length === 0) {
    return { score: 0 }
  }

  const targetClean = targetOptionText.trim().toLowerCase()
  const targetTokens = tokenize(targetOptionText)
  const correctIdxs = Array.isArray(candidateCorrect) ? candidateCorrect : [candidateCorrect]
  const correctTexts = correctIdxs
    .map((i) => candidateOptions[i] ?? '')
    .filter(Boolean)

  if (correctTexts.length === 0) return { score: 0 }

  let maxScore = 0
  let bestMatchedText = correctTexts[0].replace(/^[A-Z][\.\)]\s*/i, '').trim()

  for (const text of correctTexts) {
    const cleanCandidate = text.replace(/^[A-Z][\.\)]\s*/i, '').trim()
    const cleanCandidateLower = cleanCandidate.toLowerCase()

    // 1. Exact match -> 1.0
    if (cleanCandidateLower === targetClean) {
      return { score: 1.0, matchedText: cleanCandidate }
    }

    // 2. Token Jaccard overlap (Penalize partial token overlaps fairly)
    const candidateTokens = tokenize(cleanCandidate)
    const overlap = computeTokenOverlap(targetTokens, candidateTokens)

    if (overlap > maxScore) {
      maxScore = overlap
      bestMatchedText = cleanCandidate
    }
  }

  return {
    score: maxScore,
    matchedText: bestMatchedText,
  }
}

/**
 * Compute option match score [0.0, 1.0] (backward compatible helper)
 */
export function computeOptionMatch(
  targetOptionText: string,
  candidateOptions: string[],
  candidateCorrect: number | number[]
): number {
  return computeOptionMatchWithText(targetOptionText, candidateOptions, candidateCorrect).score
}

/**
 * Compute question text match score [0.0, 1.0] with boilerplate cleaning
 */
export function computeQuestionMatch(currentQuestionText: string, candidateQuestionText: string): number {
  if (!currentQuestionText || !candidateQuestionText) return 0
  const cleanCurrent = cleanQuestionText(currentQuestionText)
  const cleanCandidate = cleanQuestionText(candidateQuestionText)
  return computeTokenOverlap(tokenize(cleanCurrent), tokenize(cleanCandidate))
}

export interface ScoreCandidateParams {
  candidate: {
    text: string
    options?: string[]
    correctAnswer?: number | number[]
    metadata?: { categoryId?: string; courseCode?: string }
  }
  currentQuestionText: string
  targetOptionText?: string
  categoryId?: string
  courseCode?: string
}

/**
 * Calculate comprehensive relevance breakdown
 */
export function calculateRelevanceBreakdown(params: ScoreCandidateParams): RelevanceScoreBreakdown & { matchedAnswerText?: string } {
  const { candidate, currentQuestionText, targetOptionText, categoryId, courseCode } = params

  let optionScore = 0
  let matchedAnswerText: string | undefined

  if (targetOptionText) {
    const optRes = computeOptionMatchWithText(targetOptionText, candidate.options || [], candidate.correctAnswer ?? 0)
    optionScore = optRes.score
    matchedAnswerText = optRes.matchedText
  } else {
    // If no target option specified, extract first correct option text as reference
    const correctIdx = Array.isArray(candidate.correctAnswer) ? candidate.correctAnswer[0] : candidate.correctAnswer ?? 0
    matchedAnswerText = candidate.options?.[correctIdx]?.replace(/^[A-Z][\.\)]\s*/i, '').trim()
  }

  const questionScore = computeQuestionMatch(currentQuestionText, candidate.text)

  // 🛡️ 1. Hard Subject Context Gate (Hard Rejection on Subject Mismatch)
  const candidateCatId = candidate.metadata?.categoryId
  const candidateCourse = candidate.metadata?.courseCode

  let isSubjectMatch = true
  if (categoryId || courseCode) {
    if (categoryId && candidateCatId) {
      isSubjectMatch = candidateCatId === categoryId
    } else if (courseCode && candidateCourse) {
      isSubjectMatch = candidateCourse.toUpperCase() === courseCode.toUpperCase()
    } else if (candidate.metadata && (candidateCatId || candidateCourse)) {
      isSubjectMatch = false
    }
  }

  if (!isSubjectMatch) {
    return {
      totalScore: 0,
      optionScore: 0,
      questionScore: 0,
      subjectScore: 0,
      matchedAnswerText,
    }
  }

  const subjectScore = (categoryId || courseCode) ? 1.0 : 0.0

  // 🛡️ 2. Boolean Context Gate: For True/False options, matching "True"/"False" alone is meaningless without concept overlap
  const isBooleanOption = targetOptionText && /^(?:true|false)$/i.test(targetOptionText.trim())
  if (isBooleanOption && questionScore < 0.20) {
    optionScore = 0 // Invalidate option score if question contexts do not overlap
  }

  const totalScore =
    optionScore * RANKING_WEIGHTS.optionMatch +
    questionScore * RANKING_WEIGHTS.questionMatch +
    subjectScore * RANKING_WEIGHTS.subjectMatch

  const clampedTotal = Number(Math.min(1.0, Math.max(0.0, totalScore)).toFixed(4))

  return {
    totalScore: clampedTotal,
    optionScore: Number(optionScore.toFixed(4)),
    questionScore: Number(questionScore.toFixed(4)),
    subjectScore: Number(subjectScore.toFixed(4)),
    matchedAnswerText,
  }
}

/**
 * Deterministic weighted scoring algorithm
 */
export function calculateRelevanceScore(params: ScoreCandidateParams): number {
  return calculateRelevanceBreakdown(params).totalScore
}

/**
 * Filter by MIN_RELEVANCE_SCORE, sort descending deterministically, and take top N
 */
export function rankRetrievalCandidates(candidates: RetrievalResult[], limit: number = 2): RetrievalResult[] {
  return candidates
    .filter((c) => c.score >= MIN_RELEVANCE_SCORE)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.id.localeCompare(b.id) // Deterministic tie-breaker
    })
    .slice(0, limit)
}
