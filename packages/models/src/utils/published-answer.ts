import { getExplicitAnswerSelectionCount } from './question-selection-helper'
import { generateQuestionId } from './question-id-generator'

export interface PublishedAnswerQuestion {
  text?: string
  options: readonly string[]
  correct_answer: number | readonly number[]
}

/** Shared pure guard for API, bulk writers and Mongoose document validation. */
export function getPublishedAnswerError(question: PublishedAnswerQuestion): string | null {
  const answers = Array.isArray(question.correct_answer) ? question.correct_answer : [question.correct_answer]
  if (!Array.isArray(question.options) || answers.length === 0) return 'A published question must have at least one correct answer'
  if (answers.some(index => !Number.isInteger(index) || index < 0 || index >= question.options.length)) return 'Correct answer indices must be integers within options range'
  if (new Set(answers).size !== answers.length) return 'Correct answer indices must be unique'
  const count = getExplicitAnswerSelectionCount(question.text)
  if (count !== null && answers.length !== count) return 'Correct answer count must match the number requested in the question text'
  return null
}

export function normalizeOptionText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Require a bijection of every option; partial or ambiguous overlap is a conflict. */
export function remapPublishedAnswer(source: PublishedAnswerQuestion, targetOptions: readonly string[]): number[] | null {
  if (getPublishedAnswerError(source)) return null
  const sourceLabels = source.options.map(normalizeOptionText)
  const targetLabels = targetOptions.map(normalizeOptionText)
  if (sourceLabels.length !== targetLabels.length || new Set(sourceLabels).size !== sourceLabels.length || new Set(targetLabels).size !== targetLabels.length) return null
  if (sourceLabels.some(label => !label || !targetLabels.includes(label))) return null
  const answers = Array.isArray(source.correct_answer) ? source.correct_answer : [source.correct_answer]
  return answers.map(index => targetLabels.indexOf(sourceLabels[index]))
}

export function hasSameQuestionContent(source: PublishedAnswerQuestion, target: { text?: string, options: readonly string[] }): boolean {
  return normalizeOptionText(source.text || '') === normalizeOptionText(target.text || '') && remapPublishedAnswer(source, target.options) !== null
}

interface QuestionSynchronizationPlan { quiz: any; updates: Array<{ question: any; answers: number[] }> }

function matchingQuestionUpdate(question: any, source: PublishedAnswerQuestion, previous: PublishedAnswerQuestion, ids: string[]) {
  if (!question.text || !Array.isArray(question.options)) return null
  const id = question.question_id || generateQuestionId(question)
  const identityMatches = ids.includes(id) || (question.question_id_aliases ?? []).some((alias: string) => ids.includes(alias))
  if (!identityMatches && !hasSameQuestionContent(previous, question)) return null
  const answers = remapPublishedAnswer(source, question.options)
  return answers ? { question, answers } : false
}

/** Preflight every target without mutating any document or accepting partial option maps. */
export function planQuestionSynchronization(quizzes: any[], source: PublishedAnswerQuestion, ids: string[], previous = source) {
  const plans: QuestionSynchronizationPlan[] = []
  for (const quiz of quizzes) {
    const updates = (quiz.questions ?? []).map((q: any) => matchingQuestionUpdate(q, source, previous, ids))
    if (updates.includes(false)) return { plans: [], conflictQuizId: String(quiz._id) }
    const matched = updates.filter((update: any) => update !== null)
    if (matched.length) plans.push({ quiz, updates: matched })
  }
  return { plans, conflictQuizId: null }
}

export async function prepareQuestionSynchronization(plans: QuestionSynchronizationPlan[], source: PublishedAnswerQuestion & { explanation?: string; image_url?: string }) {
  for (const { quiz, updates } of plans) {
    for (const { question, answers } of updates) {
      question.text = source.text
      question.correct_answer = answers
      if (source.explanation !== undefined) question.explanation = source.explanation
      if (source.image_url !== undefined) question.image_url = source.image_url
    }
    quiz.markModified('questions')
    if (quiz.validate) await quiz.validate()
  }
}

export async function planAndPrepareQuestionSynchronization(
  quizzes: any[],
  source: PublishedAnswerQuestion & { explanation?: string; image_url?: string },
  ids: string[],
  previous = source,
) {
  const synchronization = planQuestionSynchronization(quizzes, source, ids, previous)
  if (synchronization.conflictQuizId) {
    return { success: false as const, conflictQuizId: synchronization.conflictQuizId }
  }
  await prepareQuestionSynchronization(synchronization.plans, source)
  return { success: true as const, plans: synchronization.plans }
}

export async function saveSynchronizedQuizzes(plans: QuestionSynchronizationPlan[], acknowledge: (id: string) => void) {
  for (const { quiz } of plans) {
    await quiz.save()
    acknowledge(String(quiz._id))
  }
}
