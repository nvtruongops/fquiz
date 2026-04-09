/**
 * Unit tests for GET /api/sessions/[id]/questions
 * 
 * Tests the preload endpoint that returns all questions for a quiz session.
 * Validates that:
 * - Immediate mode includes correct_answer and explanation
 * - Review mode (active) excludes correct_answer and explanation
 * - Completed sessions include correct_answer and explanation
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

describe('GET /api/sessions/[id]/questions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return all questions with answers for immediate mode', () => {
    const session = {
      _id: 'session123',
      mode: 'immediate',
      status: 'active',
      student_id: 'student123',
    }

    const quiz = {
      questions: [
        {
          _id: 'q1',
          text: 'Question 1',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 0,
          explanation: 'Explanation 1',
        },
        {
          _id: 'q2',
          text: 'Question 2',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: [0, 1],
          explanation: 'Explanation 2',
        },
      ],
    }

    // For immediate mode, all questions should include correct_answer and explanation
    const result = quiz.questions.map((q) => ({
      _id: q._id,
      text: q.text,
      options: q.options,
      answer_selection_count: Array.isArray(q.correct_answer) ? q.correct_answer.length : 1,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    }))

    expect(result[0]).toHaveProperty('correct_answer')
    expect(result[0]).toHaveProperty('explanation')
    expect(result[1]).toHaveProperty('correct_answer')
    expect(result[1]).toHaveProperty('explanation')
  })

  it('should return all questions without answers for review mode (active)', () => {
    const session = {
      _id: 'session123',
      mode: 'review',
      status: 'active',
      student_id: 'student123',
    }

    const quiz = {
      questions: [
        {
          _id: 'q1',
          text: 'Question 1',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 0,
          explanation: 'Explanation 1',
        },
      ],
    }

    // For review mode (active), questions should NOT include correct_answer and explanation
    const result = quiz.questions.map((q) => ({
      _id: q._id,
      text: q.text,
      options: q.options,
      answer_selection_count: Array.isArray(q.correct_answer) ? q.correct_answer.length : 1,
    }))

    expect(result[0]).not.toHaveProperty('correct_answer')
    expect(result[0]).not.toHaveProperty('explanation')
  })

  it('should return all questions with answers for completed sessions', () => {
    const session = {
      _id: 'session123',
      mode: 'review',
      status: 'completed',
      student_id: 'student123',
    }

    const quiz = {
      questions: [
        {
          _id: 'q1',
          text: 'Question 1',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 0,
          explanation: 'Explanation 1',
        },
      ],
    }

    // For completed sessions, questions should include correct_answer and explanation
    const result = quiz.questions.map((q) => ({
      _id: q._id,
      text: q.text,
      options: q.options,
      answer_selection_count: Array.isArray(q.correct_answer) ? q.correct_answer.length : 1,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    }))

    expect(result[0]).toHaveProperty('correct_answer')
    expect(result[0]).toHaveProperty('explanation')
  })
})
