import mongoose from 'mongoose'
import crypto from 'crypto'
import { connectDB } from '@/lib/core/db/mongodb'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { generateQuestionId } from '@/lib/modules/quiz/question-id-generator'
import type { IQuestion } from '@/lib/modules/quiz/types/quiz'
import { secureShuffle, shuffleQuestionOptions } from '@/lib/core/utils/shuffle'
import { ensureCategoryForCourseCode } from '@/lib/modules/quiz/utils/category-helper'

interface ProcessMixQuizParams {
  sessionId?: string | mongoose.Types.ObjectId
  quiz_ids: string[]
  question_count: number
  mode: 'immediate' | 'review' | 'flashcard'
  difficulty: 'sequential' | 'random'
  studentId: string
}

interface ProcessMixQuizResult {
  sessionId: string
  quizId: string
  actualCount: number
}

function extractSameSubjectCourseCode(quizzes: any[]): string {
  const extractSubjectPrefix = (code?: string): string => {
    if (!code) return ''
    const clean = code.trim().toUpperCase()
    if (clean.startsWith('TEMP_')) return ''
    const parts = clean.split('_')
    return parts[0] ?? clean
  }

  const prefixes = quizzes.map((q) => extractSubjectPrefix(q.course_code)).filter(Boolean)
  const firstPrefix = prefixes[0]
  const isSameSubjectMix = Boolean(firstPrefix && prefixes.every((p) => p === firstPrefix))
  return isSameSubjectMix ? firstPrefix : 'TRỘN'
}

function deduplicateQuizzesPools(validQuizzes: any[]): IQuestion[][] {
  const seenKeys = new Set<string>()
  const uniquePoolsPerQuiz: IQuestion[][] = validQuizzes.map((quiz) => {
    const pool: IQuestion[] = []
    for (const q of quiz.questions as IQuestion[]) {
      if (!q.question_id) {
        q.question_id = q._id ? q._id.toString() : generateQuestionId(q)
      }
      const key = q.question_id
      if (key && !seenKeys.has(key)) {
        seenKeys.add(key)
        pool.push(q)
      }
    }
    return pool
  })
  return uniquePoolsPerQuiz.filter((pool) => pool.length > 0)
}

function sampleProportionally(deduplicatedQuizzes: IQuestion[][], targetCount: number): IQuestion[] {
  const numQuizzes = deduplicatedQuizzes.length
  const baseQuota = Math.floor(targetCount / numQuizzes)
  const remainder = targetCount % numQuizzes

  const sorted = [...deduplicatedQuizzes].sort((a, b) => b.length - a.length)
  const quotas = sorted.map((pool, i) => ({
    pool,
    quota: baseQuota + (i < remainder ? 1 : 0),
  }))

  let surplus = 0
  const firstPass = quotas.map(({ pool, quota }) => {
    const available = pool.length
    if (available >= quota) return { questions: pool, quota }
    surplus += quota - available
    return { questions: pool, quota: available }
  })

  const sampled: IQuestion[] = []
  for (const pass of firstPass) {
    const shuffledPool = secureShuffle(pass.questions)
    let take = pass.quota
    if (surplus > 0) {
      const extra = Math.min(surplus, shuffledPool.length - take)
      if (extra > 0) {
        take += extra
        surplus -= extra
      }
    }
    sampled.push(...shuffledPool.slice(0, take))
  }

  const rawSampled = secureShuffle(sampled)
  return rawSampled.map((q: any) => {
    const opts = q.options || []
    const ca = Array.isArray(q.correct_answer)
      ? q.correct_answer
      : (q.correct_answer !== undefined && q.correct_answer !== null ? [q.correct_answer] : [])

    let validCa = ca
      .map((i: any) => (typeof i === 'number' ? i : parseInt(String(i), 10)))
      .filter((i: number) => !isNaN(i) && i >= 0 && i < opts.length)

    if (validCa.length === 0 && opts.length > 0) {
      validCa = [0]
    }
    return {
      ...q,
      correct_answer: validCa,
    }
  })
}

async function createTempQuizWithRetry({
  validQuizzes,
  quizObjectIds,
  finalSampled,
  actualCount,
  question_count,
  mode,
  studentObjId,
}: {
  validQuizzes: any[]
  quizObjectIds: mongoose.Types.ObjectId[]
  finalSampled: IQuestion[]
  actualCount: number
  question_count: number
  mode: string
  studentObjId: mongoose.Types.ObjectId
}): Promise<any> {
  const quizTitles = validQuizzes.map((q) => q.course_code as string)
  const titlePreview = quizTitles.join(' + ')
  const courseCode = extractSameSubjectCourseCode(validQuizzes)

  let categoryId = validQuizzes[0]?.category_id
  if (!categoryId && courseCode) {
    const cat = await ensureCategoryForCourseCode(courseCode, studentObjId)
    if (cat?._id) categoryId = cat._id
  }

  for (let retries = 0; retries < 2; retries++) {
    try {
      return await Quiz.create({
        title: `Quiz Trộn · ${titlePreview}`,
        course_code: courseCode,
        category_id: categoryId,
        questions: finalSampled,
        questionCount: actualCount,
        is_public: false,
        is_temp: true,
        created_by: studentObjId,
        status: 'published',
        mix_config: {
          quiz_ids: quizObjectIds,
          question_count: question_count,
          mode: mode,
          category_id: categoryId,
        },
      })
    } catch (err: any) {
      if (err?.code === 11000 && retries < 1) continue
      throw err
    }
  }
}

/**
 * Synchronously generates a mix quiz and its session in MongoDB.
 * Replaces unreliable background queue calls for fast in-line execution (~30ms).
 */
export async function processMixQuizGeneration({
  sessionId,
  quiz_ids,
  question_count,
  mode,
  difficulty,
  studentId,
}: ProcessMixQuizParams): Promise<ProcessMixQuizResult> {
  await connectDB()

  const studentObjId = new mongoose.Types.ObjectId(studentId)
  const quizObjectIds = quiz_ids.map((id: string) => new mongoose.Types.ObjectId(id))
  
  const quizzes = (await Quiz.find({
    _id: { $in: quizObjectIds },
    is_public: true,
    status: 'published',
    is_temp: { $ne: true },
  })
    .select('title course_code questions category_id')
    .lean()) as any[]

  const validQuizzes = quizzes.filter((q) => q.questions && q.questions.length > 0)

  if (validQuizzes.length < 2) {
    if (sessionId) {
      await QuizSession.updateOne({ _id: sessionId }, { status: 'expired' })
    }
    throw new Error('Not enough valid quizzes to mix (requires at least 2 public quizzes with questions)')
  }

  const deduplicatedQuizzes = deduplicateQuizzesPools(validQuizzes)
  const finalSampled = sampleProportionally(deduplicatedQuizzes, question_count)
  const actualCount = finalSampled.length

  const tempQuiz = await createTempQuizWithRetry({
    validQuizzes,
    quizObjectIds,
    finalSampled,
    actualCount,
    question_count,
    mode,
    studentObjId,
  })

  const questionOrder =
    difficulty === 'random'
      ? secureShuffle(Array.from({ length: actualCount }, (_, i) => i))
      : Array.from({ length: actualCount }, (_, i) => i)

  const processedQuestionsCache =
    difficulty === 'random'
      ? finalSampled.map((q: any) => shuffleQuestionOptions(q))
      : finalSampled

  const now = new Date()

  if (sessionId) {
    await QuizSession.updateOne(
      { _id: sessionId },
      {
        $set: {
          quiz_id: tempQuiz._id,
          questions_cache: processedQuestionsCache,
          question_order: questionOrder,
          status: 'active',
          flashcard_stats:
            mode === 'flashcard'
              ? {
                  total_cards: actualCount,
                  cards_known: 0,
                  cards_unknown: 0,
                  time_spent_ms: 0,
                  current_round: 1,
                }
              : undefined,
          last_activity_at: now,
        },
      }
    )
    return {
      sessionId: sessionId.toString(),
      quizId: tempQuiz._id.toString(),
      actualCount,
    }
  }

  const newSession = await QuizSession.create({
    student_id: studentObjId,
    quiz_id: tempQuiz._id,
    mode,
    difficulty,
    status: 'active',
    user_answers: [],
    current_question_index: 0,
    question_order: questionOrder,
    questions_cache: processedQuestionsCache,
    score: 0,
    is_temp: true,
    started_at: now,
    last_activity_at: now,
    flashcard_stats:
      mode === 'flashcard'
        ? {
            total_cards: actualCount,
            cards_known: 0,
            cards_unknown: 0,
            time_spent_ms: 0,
            current_round: 1,
          }
        : undefined,
  })

  return {
    sessionId: newSession._id.toString(),
    quizId: tempQuiz._id.toString(),
    actualCount,
  }
}

