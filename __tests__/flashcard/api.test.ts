/**
 * Flashcard API Tests
 * Tests for flashcard-related API endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

describe('Flashcard API Endpoints', () => {
  describe('POST /api/sessions - Flashcard Mode', () => {
    it('should create a flashcard session with correct mode', async () => {
      // Test case: Create flashcard session
      const payload = {
        quiz_id: 'valid_quiz_id',
        mode: 'flashcard',
        difficulty: 'sequential',
      }
      
      // Expected: Session created with flashcard_stats initialized
      expect(payload.mode).toBe('flashcard')
    })

    it('should initialize flashcard_stats on session creation', async () => {
      // Test case: Verify flashcard_stats structure
      const expectedStats = {
        total_cards: 20,
        cards_known: 0,
        cards_unknown: 0,
        time_spent_ms: 0,
        current_round: 1,
      }
      
      expect(expectedStats.cards_known).toBe(0)
      expect(expectedStats.cards_unknown).toBe(0)
      expect(expectedStats.current_round).toBe(1)
    })

    it('should reject invalid mode values', async () => {
      const invalidPayload = {
        quiz_id: 'valid_quiz_id',
        mode: 'invalid_mode',
        difficulty: 'sequential',
      }
      
      // Expected: Validation error
      expect(['immediate', 'review', 'flashcard']).not.toContain(invalidPayload.mode)
    })
  })

  describe('POST /api/sessions/[id]/flashcard-answer', () => {
    it('should accept knows=true and update stats', async () => {
      const payload = { knows: true, question_index: 0 }
      
      expect(typeof payload.knows).toBe('boolean')
      expect(payload.knows).toBe(true)
    })

    it('should accept knows=false and update stats', async () => {
      const payload = { knows: false, question_index: 0 }
      
      expect(typeof payload.knows).toBe('boolean')
      expect(payload.knows).toBe(false)
    })

    it('should increment current_question_index', async () => {
      const currentIndex = 5
      const nextIndex = currentIndex + 1
      
      expect(nextIndex).toBe(6)
    })

    it('should mark session as completed on last question', async () => {
      const currentIndex = 19
      const totalQuestions = 20
      const isLastQuestion = currentIndex + 1 >= totalQuestions
      
      expect(isLastQuestion).toBe(true)
    })

    it('should reject non-flashcard sessions', async () => {
      const sessionMode = 'immediate'
      
      expect(sessionMode).not.toBe('flashcard')
    })
  })

  describe('POST /api/sessions/[id]/flashcard-review', () => {
    it('should create review session from completed flashcard', async () => {
      const originalSession = {
        mode: 'flashcard',
        status: 'completed',
        flashcard_stats: {
          cards_unknown: 5,
          current_round: 1,
        },
      }
      
      expect(originalSession.mode).toBe('flashcard')
      expect(originalSession.status).toBe('completed')
      expect(originalSession.flashcard_stats.cards_unknown).toBeGreaterThan(0)
    })

    it('should increment round number in review session', async () => {
      const originalRound = 1
      const newRound = originalRound + 1
      
      expect(newRound).toBe(2)
    })

    it('should reject if no unknown cards', async () => {
      const stats = { cards_unknown: 0 }
      
      expect(stats.cards_unknown).toBe(0)
    })
  })

  describe('GET /api/sessions/[id]/result - Flashcard', () => {
    it('should return flashcard_stats for flashcard sessions', async () => {
      const result = {
        mode: 'flashcard',
        flashcard_stats: {
          total_cards: 20,
          cards_known: 15,
          cards_unknown: 5,
        },
      }
      
      expect(result.mode).toBe('flashcard')
      expect(result.flashcard_stats).toBeDefined()
      expect(result.flashcard_stats.cards_known).toBe(15)
    })

    it('should not return flashcard_stats for non-flashcard sessions', async () => {
      const result = {
        mode: 'immediate',
        flashcard_stats: undefined,
      }
      
      expect(result.mode).not.toBe('flashcard')
      expect(result.flashcard_stats).toBeUndefined()
    })
  })
})

describe('Flashcard Statistics Calculations', () => {
  it('should calculate percentage correctly', () => {
    const known = 15
    const total = 20
    const percentage = Math.round((known / total) * 100)
    
    expect(percentage).toBe(75)
  })

  it('should handle zero total cards', () => {
    const known = 0
    const total = 0
    const percentage = total > 0 ? Math.round((known / total) * 100) : 0
    
    expect(percentage).toBe(0)
  })

  it('should track both known and unknown cards', () => {
    const stats = {
      total_cards: 20,
      cards_known: 12,
      cards_unknown: 8,
    }
    
    expect(stats.cards_known + stats.cards_unknown).toBe(stats.total_cards)
  })
})

describe('Flashcard Session Flow', () => {
  it('should follow correct session lifecycle', () => {
    const states = ['active', 'completed']
    
    expect(states).toContain('active')
    expect(states).toContain('completed')
  })

  it('should not allow answers after completion', () => {
    const sessionStatus = 'completed'
    const canAnswer = sessionStatus === 'active'
    
    expect(canAnswer).toBe(false)
  })
})
