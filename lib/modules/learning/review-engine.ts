import { FSRS, Card, Rating, State } from 'fsrs.js'
import type { IFSRSState } from '@/lib/modules/learning/types/learning'

const STATE_MAP: Record<number, IFSRSState['state']> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
}

const STATE_MAP_REVERSE: Record<IFSRSState['state'], State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
}

const RATING_KEYS = ['1', '2', '3', '4'] as const

function toFSRSCard(s: IFSRSState): Card {
  const card = new Card()
  card.due = s.nextReview
  card.stability = s.stability
  card.difficulty = s.difficulty
  card.elapsed_days = s.elapsedDays
  card.scheduled_days = s.scheduledDays
  card.reps = s.reps
  card.lapses = s.lapses
  card.state = STATE_MAP_REVERSE[s.state]
  card.last_review = s.lastReview ?? new Date(0)
  return card
}

function fromFSRSCard(card: Card): IFSRSState {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    lastReview: card.last_review,
    nextReview: card.due,
    state: STATE_MAP[card.state] ?? 'new',
  }
}

export class ReviewEngine {
  private fsrs: FSRS

  constructor() {
    this.fsrs = new FSRS()
  }

  getInitialState(): IFSRSState {
    const card = new Card()
    const now = new Date()
    return {
      stability: card.stability,
      difficulty: card.difficulty,
      elapsedDays: card.elapsed_days,
      scheduledDays: card.scheduled_days,
      reps: card.reps,
      lapses: card.lapses,
      lastReview: now,
      nextReview: now,
      state: 'new',
    }
  }

  calculateNext(current: IFSRSState, grade: number): IFSRSState {
    const card = toFSRSCard(current)
    const now = new Date()
    const schedule = this.fsrs.repeat(card, now)

    const key = String(grade)
    if (!(key in schedule)) {
      throw new Error(`Invalid FSRS grade: ${grade}. Must be 1 (Again), 2 (Hard), 3 (Good), or 4 (Easy).`)
    }

    const resultCard = schedule[grade as unknown as number].card
    return fromFSRSCard(resultCard)
  }

  calculateNextWithRetrievability(current: IFSRSState, grade: number): IFSRSState & { retrievability: number } {
    const next = this.calculateNext(current, grade)
    const elapsedDays = (
      next.lastReview!.getTime() - (current.lastReview ?? next.lastReview)!.getTime()
    ) / 86400000
    const retrievability = this.getRetrievability(next.stability, Math.max(elapsedDays, 0))
    return { ...next, retrievability }
  }

  getRetrievability(stability: number, elapsedDays: number): number {
    if (stability <= 0) return 1
    return Math.pow(1 + (elapsedDays / stability), -1)
  }
}

export const reviewEngine = new ReviewEngine()
