import { parseSemesterInfo, compareQuizBySemester } from '../semester'

describe('parseSemesterInfo', () => {
  it('should parse standard 2-digit year semesters correctly', () => {
    const res1 = parseSemesterInfo('VNR202_FA23_B5_FE')
    expect(res1).toEqual({
      season: 'FA',
      year: 2023,
      rank: 20233,
      examTypeWeight: 2,
    })

    const res2 = parseSemesterInfo('VNR202_SU26_FE_C1')
    expect(res2).toEqual({
      season: 'SU',
      year: 2026,
      rank: 20262,
      examTypeWeight: 2,
    })

    const res3 = parseSemesterInfo('VNR202_SP26_RE')
    expect(res3).toEqual({
      season: 'SP',
      year: 2026,
      rank: 20261,
      examTypeWeight: 1,
    })
  })

  it('should parse 4-digit year format correctly', () => {
    const res = parseSemesterInfo('MLN131_SP2023_FE')
    expect(res).toEqual({
      season: 'SP',
      year: 2023,
      rank: 20231,
      examTypeWeight: 2,
    })
  })

  it('should handle full season names and winter seasons', () => {
    const resFall = parseSemesterInfo('SUBJECT_FALL25_FE')
    expect(resFall).toEqual({
      season: 'FALL',
      year: 2025,
      rank: 20253,
      examTypeWeight: 2,
    })

    const resSummer = parseSemesterInfo('SUBJECT_SUMMER24_RE')
    expect(resSummer).toEqual({
      season: 'SUMMER',
      year: 2024,
      rank: 20242,
      examTypeWeight: 1,
    })

    const resSpring = parseSemesterInfo('SUBJECT_SPRING25_FE')
    expect(resSpring).toEqual({
      season: 'SPRING',
      year: 2025,
      rank: 20251,
      examTypeWeight: 2,
    })

    const resWinter = parseSemesterInfo('SUBJECT_WI25_FE')
    expect(resWinter).toEqual({
      season: 'WI',
      year: 2025,
      rank: 20250,
      examTypeWeight: 2,
    })
  })

  it('should return null for titles without semester information', () => {
    expect(parseSemesterInfo('')).toBeNull()
    expect(parseSemesterInfo('DBS401_FREETIER_1')).toBeNull()
    expect(parseSemesterInfo('CHECKPOINT EXAM: REDUNDANT NETWORKS EXAM')).toBeNull()
    expect(parseSemesterInfo('QUIZ-1')).toBeNull()
  })
})

describe('compareQuizBySemester', () => {
  it('should sort semesters descending: newest year and season first', () => {
    const titles = [
      'VNR202_FA23_B5_FE',
      'VNR202_SP26_FE',
      'VNR202_SU26_FE_C1',
      'VNR202_FA25_FE',
      'VNR202_SU25_B5_FE',
      'VNR202_SP25_FE',
      'VNR202_SP23_FE',
      'VNR202_SU23_FE_1',
    ]

    const sorted = [...titles].sort(compareQuizBySemester)

    expect(sorted).toEqual([
      'VNR202_SU26_FE_C1',
      'VNR202_SP26_FE',
      'VNR202_FA25_FE',
      'VNR202_SU25_B5_FE',
      'VNR202_SP25_FE',
      'VNR202_FA23_B5_FE',
      'VNR202_SU23_FE_1',
      'VNR202_SP23_FE',
    ])
  })

  it('should prioritize FE before RE in the same semester', () => {
    const titles = [
      'VNR202_SU26_RE',
      'VNR202_SU26_B5_FE',
      'VNR202_SU26_FE_C1',
      'VNR202_SU26_RE_2',
    ]

    const sorted = [...titles].sort(compareQuizBySemester)

    expect(sorted).toEqual([
      'VNR202_SU26_B5_FE',
      'VNR202_SU26_FE_C1',
      'VNR202_SU26_RE',
      'VNR202_SU26_RE_2',
    ])
  })

  it('should place quizzes with semester keys before quizzes without semester keys', () => {
    const titles = [
      'DBS401_FREETIER_1',
      'DBS401_SP26_FE',
      'DBS401_FREETIER_2',
      'DBS401_FA25_FE',
    ]

    const sorted = [...titles].sort(compareQuizBySemester)

    expect(sorted).toEqual([
      'DBS401_SP26_FE',
      'DBS401_FA25_FE',
      'DBS401_FREETIER_1',
      'DBS401_FREETIER_2',
    ])
  })
})
