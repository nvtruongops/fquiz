import { useState } from 'react'
import { toast } from '@/hooks/useToast'
import type { QuestionItem } from './types'

export function useQuizQuestions(initialQuestions?: any[]) {
  const [questions, setQuestions] = useState<QuestionItem[]>(() => {
    if (initialQuestions && Array.isArray(initialQuestions) && initialQuestions.length > 0) {
      return initialQuestions.map((q: any) => ({
        question_id: q.question_id || '',
        text: q.text || '',
        options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ['', '', '', ''],
        correct_answer: Array.isArray(q.correct_answer) ? q.correct_answer : [0],
        explanation: q.explanation || '',
        image_url: q.image_url || '',
      }))
    }
    return [
      {
        text: '',
        options: ['', '', '', ''],
        correct_answer: [0],
        explanation: '',
      },
    ]
  })

  const [targetCount, setTargetCount] = useState<number | ''>('')

  function handleAddQuestion() {
    setQuestions((prev) => [
      ...prev,
      { text: '', options: ['', '', '', ''], correct_answer: [0], explanation: '' },
    ])
  }

  function handleMoveQuestion(index: number, direction: 'up' | 'down') {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === questions.length - 1)) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    setQuestions((prev) => {
      const clone = [...prev]
      const temp = clone[index]
      clone[index] = clone[targetIndex]
      clone[targetIndex] = temp
      return clone
    })
  }

  function handleRemoveQuestion(index: number) {
    if (questions.length <= 1) {
      toast({ title: 'Warning', description: 'Quiz must have at least 1 question', type: 'warning' })
      return
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  function handleUpdateQuestionText(index: number, text: string) {
    setQuestions((prev) => {
      const clone = [...prev]
      clone[index] = { ...clone[index], text }
      return clone
    })
  }

  function handleUpdateOption(qIndex: number, optIndex: number, val: string) {
    setQuestions((prev) => {
      const clone = [...prev]
      const updatedOpts = [...clone[qIndex].options]
      updatedOpts[optIndex] = val
      clone[qIndex] = { ...clone[qIndex], options: updatedOpts }
      return clone
    })
  }

  function handleAddOption(qIndex: number) {
    setQuestions((prev) => {
      const clone = [...prev]
      if (clone[qIndex].options.length >= 8) return clone
      clone[qIndex] = { ...clone[qIndex], options: [...clone[qIndex].options, ''] }
      return clone
    })
  }

  function handleRemoveOption(qIndex: number, optIndex: number) {
    setQuestions((prev) => {
      const clone = [...prev]
      if (clone[qIndex].options.length <= 2) {
        toast({ title: 'Warning', description: 'Each question requires at least 2 options', type: 'warning' })
        return clone
      }
      const updatedOpts = clone[qIndex].options.filter((_, i) => i !== optIndex)
      const updatedCorrect = clone[qIndex].correct_answer
        .filter((ans) => ans !== optIndex)
        .map((ans) => (ans > optIndex ? ans - 1 : ans))

      clone[qIndex] = {
        ...clone[qIndex],
        options: updatedOpts,
        correct_answer: updatedCorrect.length > 0 ? updatedCorrect : [0],
      }
      return clone
    })
  }

  function handleToggleCorrect(qIndex: number, optIndex: number) {
    setQuestions((prev) => {
      const clone = [...prev]
      clone[qIndex] = { ...clone[qIndex], correct_answer: [optIndex] }
      return clone
    })
  }

  function handleApplyTargetCount() {
    if (typeof targetCount !== 'number' || targetCount <= 0) return
    if (targetCount <= questions.length) {
      toast({ title: 'Notice', description: `Quiz already has ${questions.length} questions.`, type: 'default' })
      return
    }
    const needed = targetCount - questions.length
    const emptySlots: QuestionItem[] = Array.from({ length: needed }, () => ({
      text: '',
      options: ['', '', '', ''],
      correct_answer: [0],
      explanation: '',
    }))
    setQuestions((prev) => [...prev, ...emptySlots])
    toast({
      title: 'Success',
      description: `Added ${needed} question slots to reach target of ${targetCount} questions.`,
      type: 'success',
    })
  }

  return {
    questions,
    setQuestions,
    targetCount,
    setTargetCount,
    handleAddQuestion,
    handleMoveQuestion,
    handleRemoveQuestion,
    handleUpdateQuestionText,
    handleUpdateOption,
    handleAddOption,
    handleRemoveOption,
    handleToggleCorrect,
    handleApplyTargetCount,
  }
}
