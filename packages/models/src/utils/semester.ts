export interface SemesterInfo {
  season: string
  year: number
  rank: number
  examTypeWeight: number
}

const SEASON_WEIGHTS: Record<string, number> = {
  FA: 3,
  FALL: 3,
  SU: 2,
  SUMMER: 2,
  SP: 1,
  SPRING: 1,
  WI: 0,
  WN: 0,
  WINTER: 0,
}

/**
 * Parses term / semester information from a quiz title or course code.
 * Example patterns supported:
 * - VNR202_FA23_B5_FE -> { season: 'FA', year: 2023, rank: 20233, examTypeWeight: 2 }
 * - MLN131_SP2023_FE  -> { season: 'SP', year: 2023, rank: 20231, examTypeWeight: 2 }
 * - PMG201C_SU26_RE   -> { season: 'SU', year: 2026, rank: 20262, examTypeWeight: 1 }
 */
export function parseSemesterInfo(titleOrCode: string): SemesterInfo | null {
  if (!titleOrCode) return null
  const str = titleOrCode.toUpperCase()

  // Match season + year: e.g. FA23, SP26, SU25, SP2023, etc.
  const match = str.match(/(?:^|[_.\s-])(SP|SU|FA|WI|WN|SPRING|SUMMER|FALL|WINTER)(\d{2}|\d{4})(?:$|[_.\s-])/i)
  if (!match) return null

  const seasonRaw = match[1].toUpperCase()
  const yearRaw = match[2]

  const seasonWeight = SEASON_WEIGHTS[seasonRaw] ?? 0

  let fullYear = parseInt(yearRaw, 10)
  if (yearRaw.length === 2) {
    fullYear = fullYear < 70 ? 2000 + fullYear : 1900 + fullYear
  }

  const rank = fullYear * 10 + seasonWeight

  // Exam type weight: FE (Final Exam) > RE (Retake Exam) > Other
  let examTypeWeight = 0
  if (/(?:^|[_.\s-])FE(?:$|[_.\s\d-])/i.test(str)) {
    examTypeWeight = 2
  } else if (/(?:^|[_.\s-])RE(?:$|[_.\s\d-])/i.test(str)) {
    examTypeWeight = 1
  }

  return {
    season: seasonRaw,
    year: fullYear,
    rank,
    examTypeWeight,
  }
}

/**
 * Compares two quizzes by semester in descending chronological order (newest first).
 * Order of precedence:
 * 1. Chronological semester rank (e.g. 2026 Fall > 2026 Summer > 2026 Spring > 2025 Fall ...)
 * 2. Exam type (FE before RE for the same semester)
 * 3. Natural alphanumeric sort on title as deterministic tie-breaker
 * 4. Quizzes with valid semester keys appear before quizzes without semester keys.
 */
export function compareQuizBySemester(aTitle: string, bTitle: string): number {
  const semA = parseSemesterInfo(aTitle)
  const semB = parseSemesterInfo(bTitle)

  if (semA && semB) {
    if (semA.rank !== semB.rank) {
      return semB.rank - semA.rank // Newest year & season first
    }
    // Same semester: FE before RE
    if (semA.examTypeWeight !== semB.examTypeWeight) {
      return semB.examTypeWeight - semA.examTypeWeight
    }
    // Same semester and exam type: natural alphanumeric sort
    return aTitle.localeCompare(bTitle, undefined, { numeric: true, sensitivity: 'base' })
  }

  if (semA && !semB) return -1
  if (!semA && semB) return 1

  return aTitle.localeCompare(bTitle, undefined, { numeric: true, sensitivity: 'base' })
}
