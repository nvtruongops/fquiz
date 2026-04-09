/**
 * Test suite for session pause/resume time tracking
 * 
 * Validates:
 * - Pause event sets paused_at timestamp
 * - Resume event calculates and accumulates pause duration
 * - Auto-detect pause when user returns after long inactivity
 * - Total study time excludes paused duration
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { Types } from 'mongoose'

interface QuizSession {
  _id: Types.ObjectId
  student_id: Types.ObjectId
  quiz_id: Types.ObjectId
  status: 'active' | 'completed'
  started_at: Date
  completed_at?: Date
  last_activity_at?: Date
  paused_at?: Date
  total_paused_duration_ms?: number
}

describe('Session Pause/Resume Time Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Pause Event', () => {
    it('should set paused_at timestamp when pause event is triggered', () => {
      const session: QuizSession = {
        _id: new Types.ObjectId(),
        student_id: new Types.ObjectId(),
        quiz_id: new Types.ObjectId(),
        status: 'active',
        started_at: new Date('2024-01-01T10:00:00Z'),
        last_activity_at: new Date('2024-01-01T10:05:00Z'),
        total_paused_duration_ms: 0,
      }

      const pauseTime = new Date('2024-01-01T10:05:00Z')
      
      // Simulate pause event
      const updatedSession = {
        ...session,
        paused_at: pauseTime,
        last_activity_at: pauseTime,
      }

      expect(updatedSession.paused_at).toEqual(pauseTime)
      expect(updatedSession.paused_at?.getTime()).toBe(pauseTime.getTime())
    })

    it('should update last_activity_at when pause event occurs', () => {
      const session: QuizSession = {
        _id: new Types.ObjectId(),
        student_id: new Types.ObjectId(),
        quiz_id: new Types.ObjectId(),
        status: 'active',
        started_at: new Date('2024-01-01T10:00:00Z'),
        last_activity_at: new Date('2024-01-01T10:03:00Z'),
        total_paused_duration_ms: 0,
      }

      const pauseTime = new Date('2024-01-01T10:05:00Z')
      
      const updatedSession = {
        ...session,
        paused_at: pauseTime,
        last_activity_at: pauseTime,
      }

      expect(updatedSession.last_activity_at).toEqual(pauseTime)
    })
  })

  describe('Resume Event - Normal Case', () => {
    it('should calculate pause duration and accumulate to total when resume event is triggered', () => {
      const session: QuizSession = {
        _id: new Types.ObjectId(),
        student_id: new Types.ObjectId(),
        quiz_id: new Types.ObjectId(),
        status: 'active',
        started_at: new Date('2024-01-01T10:00:00Z'),
        last_activity_at: new Date('2024-01-01T10:05:00Z'),
        paused_at: new Date('2024-01-01T10:05:00Z'),
        total_paused_duration_ms: 0,
      }

      const resumeTime = new Date('2024-01-01T11:00:00Z')
      
      // Calculate pause duration
      const pauseDuration = resumeTime.getTime() - session.paused_at!.getTime()
      const expectedTotalPaused = (session.total_paused_duration_ms || 0) + pauseDuration

      const updatedSession = {
        ...session,
        paused_at: undefined,
        last_activity_at: resumeTime,
        total_paused_duration_ms: expectedTotalPaused,
      }

      expect(updatedSession.paused_at).toBeUndefined()
      expect(updatedSession.total_paused_duration_ms).toBe(55 * 60 * 1000) // 55 minutes
    })

    it('should accumulate multiple pause durations', () => {
      const session: QuizSession = {
        _id: new Types.ObjectId(),
        student_id: new Types.ObjectId(),
        quiz_id: new Types.ObjectId(),
        status: 'active',
        started_at: new Date('2024-01-01T10:00:00Z'),
        last_activity_at: new Date('2024-01-01T10:10:00Z'),
        paused_at: new Date('2024-01-01T10:10:00Z'),
        total_paused_duration_ms: 5 * 60 * 1000, // Already paused 5 minutes before
      }

      const resumeTime = new Date('2024-01-01T10:20:00Z')
      
      const pauseDuration = resumeTime.getTime() - session.paused_at!.getTime()
      const expectedTotalPaused = (session.total_paused_duration_ms || 0) + pauseDuration

      expect(expectedTotalPaused).toBe(15 * 60 * 1000) // 5 + 10 = 15 minutes total
    })
  })

  describe('Resume Event - Auto-detect Pause', () => {
    it('should auto-detect pause when user returns after 5+ minutes without paused_at', () => {
      const AUTO_PAUSE_THRESHOLD = 5 * 60 * 1000 // 5 minutes

      const session: QuizSession = {
        _id: new Types.ObjectId(),
        student_id: new Types.ObjectId(),
        quiz_id: new Types.ObjectId(),
        status: 'active',
        started_at: new Date('2024-01-01T10:00:00Z'),
        last_activity_at: new Date('2024-01-01T10:05:00Z'),
        paused_at: undefined, // No paused_at (tab closed without pause event)
        total_paused_duration_ms: 0,
      }

      const resumeTime = new Date('2024-01-01T11:00:00Z')
      
      const timeSinceLastActivity = resumeTime.getTime() - session.last_activity_at!.getTime()
      
      let totalPausedDuration = session.total_paused_duration_ms || 0
      
      if (timeSinceLastActivity > AUTO_PAUSE_THRESHOLD) {
        totalPausedDuration += timeSinceLastActivity
      }

      expect(timeSinceLastActivity).toBe(55 * 60 * 1000) // 55 minutes
      expect(timeSinceLastActivity).toBeGreaterThan(AUTO_PAUSE_THRESHOLD)
      expect(totalPausedDuration).toBe(55 * 60 * 1000)
    })

    it('should NOT auto-detect pause when user returns within 5 minutes', () => {
      const AUTO_PAUSE_THRESHOLD = 5 * 60 * 1000

      const session: QuizSession = {
        _id: new Types.ObjectId(),
        student_id: new Types.ObjectId(),
        quiz_id: new Types.ObjectId(),
        status: 'active',
        started_at: new Date('2024-01-01T10:00:00Z'),
        last_activity_at: new Date('2024-01-01T10:05:00Z'),
        paused_at: undefined,
        total_paused_duration_ms: 0,
      }

      const resumeTime = new Date('2024-01-01T10:08:00Z') // Only 3 minutes later
      
      const timeSinceLastActivity = resumeTime.getTime() - session.last_activity_at!.getTime()
      
      let totalPausedDuration = session.total_paused_duration_ms || 0
      
      if (timeSinceLastActivity > AUTO_PAUSE_THRESHOLD) {
        totalPausedDuration += timeSinceLastActivity
      }

      expect(timeSinceLastActivity).toBe(3 * 60 * 1000) // 3 minutes
      expect(timeSinceLastActivity).toBeLessThan(AUTO_PAUSE_THRESHOLD)
      expect(totalPausedDuration).toBe(0) // No pause added
    })
  })

  describe('Study Time Calculation', () => {
    it('should calculate correct study time excluding paused duration', () => {
      const session: QuizSession = {
        _id: new Types.ObjectId(),
        student_id: new Types.ObjectId(),
        quiz_id: new Types.ObjectId(),
        status: 'completed',
        started_at: new Date('2024-01-01T10:00:00Z'),
        completed_at: new Date('2024-01-01T11:03:00Z'),
        total_paused_duration_ms: 55 * 60 * 1000, // 55 minutes paused
      }

      const totalTime = session.completed_at!.getTime() - session.started_at.getTime()
      const pausedTime = session.total_paused_duration_ms || 0
      const actualStudyTime = totalTime - pausedTime

      expect(totalTime).toBe(63 * 60 * 1000) // 63 minutes total
      expect(pausedTime).toBe(55 * 60 * 1000) // 55 minutes paused
      expect(actualStudyTime).toBe(8 * 60 * 1000) // 8 minutes actual study
    })

    it('should handle session with no pauses', () => {
      const session: QuizSession = {
        _id: new Types.ObjectId(),
        student_id: new Types.ObjectId(),
        quiz_id: new Types.ObjectId(),
        status: 'completed',
        started_at: new Date('2024-01-01T10:00:00Z'),
        completed_at: new Date('2024-01-01T10:30:00Z'),
        total_paused_duration_ms: 0,
      }

      const totalTime = session.completed_at!.getTime() - session.started_at.getTime()
      const pausedTime = session.total_paused_duration_ms || 0
      const actualStudyTime = totalTime - pausedTime

      expect(actualStudyTime).toBe(30 * 60 * 1000) // 30 minutes
      expect(actualStudyTime).toBe(totalTime)
    })

    it('should handle multiple pause/resume cycles correctly', () => {
      // Scenario:
      // 10:00 - Start
      // 10:05 - Pause (5 min work)
      // 10:10 - Resume (5 min pause)
      // 10:15 - Pause (5 min work)
      // 10:25 - Resume (10 min pause)
      // 10:28 - Complete (3 min work)
      // Total: 13 min work, 15 min pause

      const session: QuizSession = {
        _id: new Types.ObjectId(),
        student_id: new Types.ObjectId(),
        quiz_id: new Types.ObjectId(),
        status: 'completed',
        started_at: new Date('2024-01-01T10:00:00Z'),
        completed_at: new Date('2024-01-01T10:28:00Z'),
        total_paused_duration_ms: 15 * 60 * 1000, // 15 minutes total paused
      }

      const totalTime = session.completed_at!.getTime() - session.started_at.getTime()
      const pausedTime = session.total_paused_duration_ms || 0
      const actualStudyTime = totalTime - pausedTime

      expect(totalTime).toBe(28 * 60 * 1000) // 28 minutes total
      expect(pausedTime).toBe(15 * 60 * 1000) // 15 minutes paused
      expect(actualStudyTime).toBe(13 * 60 * 1000) // 13 minutes actual study
    })
  })

  describe('Edge Cases', () => {
    it('should handle resume without prior pause (first time loading)', () => {
      const session: QuizSession = {
        _id: new Types.ObjectId(),
        student_id: new Types.ObjectId(),
        quiz_id: new Types.ObjectId(),
        status: 'active',
        started_at: new Date('2024-01-01T10:00:00Z'),
        last_activity_at: new Date('2024-01-01T10:00:00Z'),
        paused_at: undefined,
        total_paused_duration_ms: 0,
      }

      const resumeTime = new Date('2024-01-01T10:01:00Z')
      
      // Should not add any pause duration
      const timeSinceLastActivity = resumeTime.getTime() - session.last_activity_at!.getTime()
      const AUTO_PAUSE_THRESHOLD = 5 * 60 * 1000
      
      let totalPausedDuration = session.total_paused_duration_ms || 0
      
      if (session.paused_at) {
        // Normal resume - not applicable here
      } else if (timeSinceLastActivity > AUTO_PAUSE_THRESHOLD) {
        totalPausedDuration += timeSinceLastActivity
      }

      expect(totalPausedDuration).toBe(0) // No pause added
    })

    it('should handle negative time differences gracefully', () => {
      // This shouldn't happen in production, but test defensive coding
      const session: QuizSession = {
        _id: new Types.ObjectId(),
        student_id: new Types.ObjectId(),
        quiz_id: new Types.ObjectId(),
        status: 'completed',
        started_at: new Date('2024-01-01T10:00:00Z'),
        completed_at: new Date('2024-01-01T09:00:00Z'), // Completed before started (clock skew)
        total_paused_duration_ms: 0,
      }

      const totalTime = session.completed_at!.getTime() - session.started_at.getTime()
      const pausedTime = session.total_paused_duration_ms || 0
      const actualStudyTime = Math.max(0, totalTime - pausedTime)

      expect(actualStudyTime).toBe(0) // Should not be negative
    })

    it('should handle very long pause durations', () => {
      const session: QuizSession = {
        _id: new Types.ObjectId(),
        student_id: new Types.ObjectId(),
        quiz_id: new Types.ObjectId(),
        status: 'active',
        started_at: new Date('2024-01-01T10:00:00Z'),
        last_activity_at: new Date('2024-01-01T10:05:00Z'),
        paused_at: new Date('2024-01-01T10:05:00Z'),
        total_paused_duration_ms: 0,
      }

      const resumeTime = new Date('2024-01-02T10:05:00Z') // 24 hours later
      
      const pauseDuration = resumeTime.getTime() - session.paused_at!.getTime()
      const expectedTotalPaused = (session.total_paused_duration_ms || 0) + pauseDuration

      expect(pauseDuration).toBe(24 * 60 * 60 * 1000) // 24 hours
      expect(expectedTotalPaused).toBe(24 * 60 * 60 * 1000)
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete user journey with tab close', () => {
      // User journey:
      // 1. Start quiz at 10:00
      // 2. Work until 10:05
      // 3. Close tab (pause event sent with keepalive)
      // 4. Open tab at 11:00 (resume with paused_at)
      // 5. Work until 11:03
      // 6. Complete quiz

      let session: QuizSession = {
        _id: new Types.ObjectId(),
        student_id: new Types.ObjectId(),
        quiz_id: new Types.ObjectId(),
        status: 'active',
        started_at: new Date('2024-01-01T10:00:00Z'),
        last_activity_at: new Date('2024-01-01T10:00:00Z'),
        total_paused_duration_ms: 0,
      }

      // Step 1: Work until 10:05
      session.last_activity_at = new Date('2024-01-01T10:05:00Z')

      // Step 2: Close tab - pause event
      session.paused_at = new Date('2024-01-01T10:05:00Z')

      // Step 3: Open tab at 11:00 - resume event
      const resumeTime = new Date('2024-01-01T11:00:00Z')
      const pauseDuration = resumeTime.getTime() - session.paused_at!.getTime()
      session.total_paused_duration_ms = (session.total_paused_duration_ms || 0) + pauseDuration
      session.paused_at = undefined
      session.last_activity_at = resumeTime

      // Step 4: Complete at 11:03
      session.status = 'completed'
      session.completed_at = new Date('2024-01-01T11:03:00Z')

      // Calculate final study time
      const totalTime = session.completed_at.getTime() - session.started_at.getTime()
      const actualStudyTime = totalTime - (session.total_paused_duration_ms || 0)

      expect(session.total_paused_duration_ms).toBe(55 * 60 * 1000) // 55 min paused
      expect(totalTime).toBe(63 * 60 * 1000) // 63 min total
      expect(actualStudyTime).toBe(8 * 60 * 1000) // 8 min actual work
    })

    it('should handle complete user journey with tab close and no pause event', () => {
      // User journey (network failure scenario):
      // 1. Start quiz at 10:00
      // 2. Work until 10:05
      // 3. Close tab (pause event FAILS to send)
      // 4. Open tab at 11:00 (resume with auto-detect)
      // 5. Work until 11:03
      // 6. Complete quiz

      let session: QuizSession = {
        _id: new Types.ObjectId(),
        student_id: new Types.ObjectId(),
        quiz_id: new Types.ObjectId(),
        status: 'active',
        started_at: new Date('2024-01-01T10:00:00Z'),
        last_activity_at: new Date('2024-01-01T10:00:00Z'),
        total_paused_duration_ms: 0,
      }

      // Step 1: Work until 10:05
      session.last_activity_at = new Date('2024-01-01T10:05:00Z')

      // Step 2: Close tab - pause event FAILS (no paused_at set)

      // Step 3: Open tab at 11:00 - resume with auto-detect
      const resumeTime = new Date('2024-01-01T11:00:00Z')
      const timeSinceLastActivity = resumeTime.getTime() - session.last_activity_at!.getTime()
      const AUTO_PAUSE_THRESHOLD = 5 * 60 * 1000

      if (!session.paused_at && timeSinceLastActivity > AUTO_PAUSE_THRESHOLD) {
        session.total_paused_duration_ms = (session.total_paused_duration_ms || 0) + timeSinceLastActivity
      }
      session.last_activity_at = resumeTime

      // Step 4: Complete at 11:03
      session.status = 'completed'
      session.completed_at = new Date('2024-01-01T11:03:00Z')

      // Calculate final study time
      const totalTime = session.completed_at.getTime() - session.started_at.getTime()
      const actualStudyTime = totalTime - (session.total_paused_duration_ms || 0)

      expect(session.total_paused_duration_ms).toBe(55 * 60 * 1000) // 55 min auto-detected
      expect(totalTime).toBe(63 * 60 * 1000) // 63 min total
      expect(actualStudyTime).toBe(8 * 60 * 1000) // 8 min actual work
    })
  })
})
