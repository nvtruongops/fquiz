import { generateCanonicalQuestionHash } from './ast-normalizer'

export interface QuizSimilarityInput {
  _id: string
  title: string
  course_code: string
  category_id: string
  questions: Array<{
    text: string
    options: string[]
    correct_answer: number | number[]
  }>
}

export interface QuizDuplicateResult {
  quizId1: string
  quizId2: string
  courseCode1: string
  courseCode2: string
  similarityPercent: number
  matchingQuestionsCount: number
  totalQuestions1: number
  totalQuestions2: number
  isExactDuplicate: boolean
}

/**
 * Calculates similarity percentage between two quizzes using canonical question hashes.
 */
export function calculateQuizSimilarity(quiz1: QuizSimilarityInput, quiz2: QuizSimilarityInput): QuizDuplicateResult {
  const hashes1 = new Set(quiz1.questions.map((q) => generateCanonicalQuestionHash(q)))
  const hashes2 = new Set(quiz2.questions.map((q) => generateCanonicalQuestionHash(q)))

  let matchCount = 0
  hashes1.forEach((hash) => {
    if (hashes2.has(hash)) matchCount++
  })

  const maxTotal = Math.max(quiz1.questions.length, quiz2.questions.length, 1)
  const similarityPercent = Math.round((matchCount / maxTotal) * 100)

  return {
    quizId1: quiz1._id,
    quizId2: quiz2._id,
    courseCode1: quiz1.course_code,
    courseCode2: quiz2.course_code,
    similarityPercent,
    matchingQuestionsCount: matchCount,
    totalQuestions1: quiz1.questions.length,
    totalQuestions2: quiz2.questions.length,
    isExactDuplicate: similarityPercent === 100 && quiz1.questions.length === quiz2.questions.length,
  }
}

/**
 * Audits a collection of quizzes across Category -> Quiz -> Question hierarchy
 * to identify exact duplicate and near-duplicate quizzes.
 */
export function auditQuizzesSimilarity(quizzes: QuizSimilarityInput[]): {
  exactDuplicates: QuizDuplicateResult[]
  nearDuplicates: QuizDuplicateResult[]
  uniqueQuizCount: number
} {
  const exactDuplicates: QuizDuplicateResult[] = []
  const nearDuplicates: QuizDuplicateResult[] = []

  for (let i = 0; i < quizzes.length; i++) {
    /* eslint-disable security/detect-object-injection */
    const q1 = quizzes[i]
    for (let j = i + 1; j < quizzes.length; j++) {
      const q2 = quizzes[j]
      const sim = calculateQuizSimilarity(q1, q2)
      if (sim.isExactDuplicate) {
        exactDuplicates.push(sim)
      } else if (sim.similarityPercent >= 80) {
        nearDuplicates.push(sim)
      }
    }
    /* eslint-enable security/detect-object-injection */
  }

  const uniqueQuizCount = quizzes.length - exactDuplicates.length

  return {
    exactDuplicates,
    nearDuplicates,
    uniqueQuizCount,
  }
}
