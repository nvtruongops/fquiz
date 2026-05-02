'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDebounce } from './useDebounce'
import { withCsrfHeaders } from '@/lib/csrf'

interface QuestionInput {
  text: string
  options: string[]
  correct_answer: number[]
  explanation?: string
  image_url?: string
}

interface ConflictInfo {
  questionIndex: number
  question: QuestionInput
  existingQuestion?: {
    _id: string
    text: string
    options: string[]
    correct_answer: number[]
    explanation?: string
    used_in_quizzes: string[]
    usage_count: number
  }
  conflictType: 'same_answer' | 'different_answer'
  message: string
}

interface CheckResult {
  total_questions: number
  conflicts_found: number
  same_answer_conflicts: number
  different_answer_conflicts: number
  conflicts: {
    same_answer: ConflictInfo[]
    different_answer: ConflictInfo[]
  }
  summary: string
}

interface UseQuestionBankCheckOptions {
  categoryId: string
  questions: QuestionInput[]
  enabled?: boolean
  debounceMs?: number
}

export function useQuestionBankCheck({
  categoryId,
  questions,
  enabled = true,
  debounceMs = 1000,
}: UseQuestionBankCheckOptions) {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Debounce questions để tránh check quá nhiều
  const debouncedQuestions = useDebounce(questions, debounceMs)

  const checkQuestions = useCallback(async () => {
    if (!enabled || !categoryId || questions.length === 0) {
      setResult(null)
      return
    }

    // Chỉ check câu hỏi có nội dung
    const validQuestions = questions.filter(
      q => q.text.trim() && q.options.some(o => o.trim())
    )

    if (validQuestions.length === 0) {
      setResult(null)
      return
    }

    setChecking(true)
    setError(null)

    try {
      const response = await fetch('/api/question-bank/check', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          category_id: categoryId,
          questions: validQuestions.map(q => ({
            text: q.text,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            image_url: q.image_url,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to check question bank')
      }

      const data: CheckResult = await response.json()
      setResult(data)
    } catch (err) {
      console.error('Question bank check error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setResult(null)
    } finally {
      setChecking(false)
    }
  }, [categoryId, questions, enabled])

  // Auto-check khi questions thay đổi (debounced)
  useEffect(() => {
    checkQuestions()
  }, [debouncedQuestions, categoryId, enabled])

  const hasDifferentAnswerConflicts = result?.different_answer_conflicts ?? 0 > 0
  const hasSameAnswerConflicts = result?.same_answer_conflicts ?? 0 > 0
  const hasAnyConflicts = result?.conflicts_found ?? 0 > 0

  return {
    checking,
    result,
    error,
    hasDifferentAnswerConflicts,
    hasSameAnswerConflicts,
    hasAnyConflicts,
    refetch: checkQuestions,
  }
}
