export interface SemesterInfo {
  season: 'FA' | 'SU' | 'SP' | 'WI' | 'UNKNOWN'
  seasonWeight: number
  year: number
  fullYear: number
  typeWeight: number // 2: FE, 1: RE, 0: other
  isSemesterQuiz: boolean
  rawRank: number
}

const SEASON_WEIGHT_MAP: Record<string, number> = {
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
 * Extracts semester information (Season, Year, Exam Type) from a quiz title or course code.
 * Example inputs:
 *  - "VNR202_SU26_B5_FE" -> Season: SU, Year: 2026, Type: FE (weight: 2)
 *  - "VNR202_SP26_FE"    -> Season: SP, Year: 2026, Type: FE (weight: 2)
 *  - "VNR202_FA23_RE"    -> Season: FA, Year: 2023, Type: RE (weight: 1)
 */
export function parseSemesterInfo(titleOrCode: string): SemesterInfo {
  if (!titleOrCode) {
    return {
      season: 'UNKNOWN',
      seasonWeight: -1,
      year: 0,
      fullYear: 0,
      typeWeight: 0,
      isSemesterQuiz: false,
      rawRank: -1,
    }
  }

  const clean = titleOrCode.trim().toUpperCase()

  // Match season and year: e.g. FA23, SU26, SP2026, FALL24, SUMMER25 (handles underscores and delimiters)
  const semesterMatch = clean.match(
    /(?:^|[^A-Z0-9])(FA|FALL|SU|SUMMER|SP|SPRING|WI|WN|WINTER)(\d{2,4})(?:$|[^A-Z0-9])/i
  )

  let season: SemesterInfo['season'] = 'UNKNOWN'
  let seasonWeight = -1
  let year = 0
  let fullYear = 0
  let isSemesterQuiz = false

  if (semesterMatch) {
    const rawSeason = semesterMatch[1].toUpperCase()
    const rawYear = parseInt(semesterMatch[2], 10)

    seasonWeight = SEASON_WEIGHT_MAP[rawSeason] ?? -1
    season =
      rawSeason.startsWith('FA')
        ? 'FA'
        : rawSeason.startsWith('SU')
          ? 'SU'
          : rawSeason.startsWith('SP')
            ? 'SP'
            : rawSeason.startsWith('W')
              ? 'WI'
              : 'UNKNOWN'

    if (rawYear >= 1000) {
      fullYear = rawYear
      year = rawYear % 100
    } else {
      year = rawYear
      fullYear = 2000 + rawYear
    }
    isSemesterQuiz = true
  }

  // Determine exam type weight: FE (2) > RE (1) > other (0)
  let typeWeight = 0
  if (/(?:^|[^A-Z0-9])FE(?:$|[^A-Z0-9])/i.test(clean)) {
    typeWeight = 2
  } else if (/(?:^|[^A-Z0-9])RE(?:$|[^A-Z0-9])/i.test(clean)) {
    typeWeight = 1
  }

  // Calculate chronological sort rank: fullYear * 10 + seasonWeight
  const rawRank = isSemesterQuiz ? fullYear * 10 + seasonWeight : -1

  return {
    season,
    seasonWeight,
    year,
    fullYear,
    typeWeight,
    isSemesterQuiz,
    rawRank,
  }
}

/**
 * Comparator for sorting quizzes chronologically by semester:
 * 1. Quizzes with semester codes rank higher than non-semester quizzes.
 * 2. Higher year first (e.g. 2026 > 2025 > 2024 > 2023).
 * 3. Within the same year: Fall (FA) > Summer (SU) > Spring (SP) > Winter (WI).
 * 4. Within the same semester: FE before RE (Official Final Exam before Retake Exam).
 * 5. Natural alphabetical sort as tie-breaker.
 */
export function compareQuizBySemester(aTitle: string, bTitle: string): number {
  const semA = parseSemesterInfo(aTitle)
  const semB = parseSemesterInfo(bTitle)

  // Both have semester information
  if (semA.isSemesterQuiz && semB.isSemesterQuiz) {
    // 1. Compare Year and Season rank (descending: newest first)
    if (semA.rawRank !== semB.rawRank) {
      return semB.rawRank - semA.rawRank
    }

    // 2. Compare Exam Type (FE before RE: descending)
    if (semA.typeWeight !== semB.typeWeight) {
      return semB.typeWeight - semA.typeWeight
    }

    // 3. Tie-breaker: natural alphanumeric comparison
    return (aTitle || '').localeCompare(bTitle || '', undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  }

  // If only A has semester info, A comes first
  if (semA.isSemesterQuiz && !semB.isSemesterQuiz) {
    return -1
  }

  // If only B has semester info, B comes first
  if (!semA.isSemesterQuiz && semB.isSemesterQuiz) {
    return 1
  }

  // Neither has semester info: natural alphanumeric comparison
  return (aTitle || '').localeCompare(bTitle || '', undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}
