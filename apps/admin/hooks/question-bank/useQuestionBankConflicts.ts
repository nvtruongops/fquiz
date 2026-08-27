import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/hooks/useToast'

export interface Conflict {
  question_id: string
  text: string
  total_variants: number
  answer_groups: Array<{
    correct_answer: number[]
    count: number
    quizzes: string[]
    sample_variant: {
      quiz_id: string
      course_code: string
      question_index: number
      options: string[]
      correct_answer: number[]
      explanation?: string
      image_url?: string
    }
  }>
}

export function useQuestionBankConflicts(initialCategory: string = 'all') {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory)
  const [loading, setLoading] = useState(false)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null)
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0)
  const [updateAllQuizzes, setUpdateAllQuizzes] = useState(false)
  const [resolving, setResolving] = useState(false)

  const fetchConflicts = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/question-bank/conflicts?category_id=${selectedCategory}`,
        { credentials: 'include' }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch conflicts')
      }

      const data = await response.json()
      setConflicts(data.conflicts || [])
    } catch (error) {
      console.error('Error fetching conflicts:', error)
      toast({ title: 'Lỗi', description: 'Không thể tải danh sách conflicts', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [selectedCategory])

  useEffect(() => {
    fetchConflicts()
  }, [fetchConflicts])

  const handleResolve = async () => {
    if (!selectedConflict || !selectedCategory) return

    const selectedGroup = selectedConflict.answer_groups[selectedVariantIndex]
    if (!selectedGroup) return

    setResolving(true)
    try {
      const response = await fetch('/api/question-bank/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category_id: selectedCategory,
          question_id: selectedConflict.question_id,
          question_text: selectedConflict.text,
          selected_variant: selectedGroup.sample_variant,
          update_quizzes: updateAllQuizzes,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to resolve conflict')
      }

      const data = await response.json()
      toast({ title: 'Thành công', description: data.message || 'Đã resolve conflict thành công!', type: 'success' })

      await fetchConflicts()
      setSelectedConflict(null)
      setSelectedVariantIndex(0)
      setUpdateAllQuizzes(false)
    } catch (error) {
      console.error('Error resolving conflict:', error)
      toast({ title: 'Lỗi', description: 'Không thể resolve conflict', type: 'error' })
    } finally {
      setResolving(false)
    }
  }

  return {
    selectedCategory,
    setSelectedCategory,
    loading,
    conflicts,
    selectedConflict,
    setSelectedConflict,
    selectedVariantIndex,
    setSelectedVariantIndex,
    updateAllQuizzes,
    setUpdateAllQuizzes,
    resolving,
    fetchConflicts,
    handleResolve,
  }
}
