'use client'

import { useState, useCallback } from 'react'
import { getCsrfTokenFromCookie } from '@/lib/csrf'

interface Question {
  text: string
  options: string[]
  correct_answer: number[]
  explanation?: string
  image_url?: string
}

interface UsageInfo {
  exists: boolean
  question_id?: string
  usage_count?: number
  used_in_quizzes?: string[]
  bank_answer?: number[]
}

export function useQuestionBankWarning(categoryId: string) {
  const [checking, setChecking] = useState(false)
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null)

  const checkQuestionUsage = useCallback(
    async (question: Question): Promise<UsageInfo | null> => {
      if (!categoryId || !question.text.trim()) {
        return null
      }

      setChecking(true)
      try {
        const csrfToken = getCsrfTokenFromCookie()

        const response = await fetch('/api/question-bank/check-usage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({
            category_id: categoryId,
            question,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to check question usage')
        }

        const data = await response.json()
        setUsageInfo(data)
        return data
      } catch (error) {
        console.error('Error checking question usage:', error)
        return null
      } finally {
        setChecking(false)
      }
    },
    [categoryId]
  )

  const clearUsageInfo = useCallback(() => {
    setUsageInfo(null)
  }, [])

  return {
    checking,
    usageInfo,
    checkQuestionUsage,
    clearUsageInfo,
  }
}
