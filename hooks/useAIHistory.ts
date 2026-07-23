'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

export interface AILearningLogItem {
  _id: string
  type: string
  title: string
  language: string
  cefrLevel?: string
  topic?: string
  params?: Record<string, any>
  prompt?: string
  content?: any
  response?: string
  userSubmission?: string
  evalResult?: any
  score?: number
  metadata?: Record<string, any>
  createdAt: string
}

export interface HistoryResponse {
  success: boolean
  history: AILearningLogItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

async function fetchAIHistory(page: number, typeFilter: string, search: string): Promise<HistoryResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: '10',
  })
  if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter)
  if (search) params.append('search', search)

  const res = await fetch(`/api/v1/ai/history?${params.toString()}`)
  if (!res.ok) throw new Error('Không thể tải lịch sử học AI')
  return res.json()
}

export function useAIHistory() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedLog, setSelectedLog] = useState<AILearningLogItem | null>(null)

  // Interactive states for history preview modal
  const [showParagraphTranslation, setShowParagraphTranslation] = useState(false)
  const [showStoryTranslation, setShowStoryTranslation] = useState(false)
  const [flashcardIndex, setFlashcardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null)
  const [writingModalSubTab, setWritingModalSubTab] = useState<'config' | 'eval'>('eval')

  // Reset interactive states when selected log changes
  useEffect(() => {
    setShowParagraphTranslation(false)
    setShowStoryTranslation(false)
    setFlashcardIndex(0)
    setIsFlipped(false)
    setShowHint(false)
    setWritingModalSubTab('eval')
  }, [selectedLog])

  const logContent = useMemo(() => {
    if (!selectedLog) return null
    if (selectedLog.content) return selectedLog.content
    if (!selectedLog.response) return null

    const raw = typeof selectedLog.response === 'string'
      ? selectedLog.response
      : JSON.stringify(selectedLog.response)

    try {
      return JSON.parse(raw)
    } catch {
      // JSON truncated repair logic
    }

    try {
      const lastCompleteObj = raw.lastIndexOf('},')
      const lastCloseBrace = raw.lastIndexOf('}')

      let repairedStr = ''
      if (lastCompleteObj > 0) {
        repairedStr = raw.substring(0, lastCompleteObj + 1) + ']'
      } else if (lastCloseBrace > 0 && raw.trimStart().startsWith('[')) {
        repairedStr = raw.substring(0, lastCloseBrace + 1) + ']'
      } else if (lastCloseBrace > 0 && raw.trimStart().startsWith('{')) {
        repairedStr = raw.substring(0, lastCloseBrace + 1)
      }

      if (repairedStr) {
        const parsed = JSON.parse(repairedStr)
        if (Array.isArray(parsed)) {
          return Object.assign(parsed, { _partial: true })
        }
        return { ...parsed, _partial: true }
      }
    } catch {
      // Repair failed
    }

    return null
  }, [selectedLog])

  const logParams = useMemo(() => {
    if (!selectedLog) return {}
    if (selectedLog.metadata?.params) return selectedLog.metadata.params
    if (selectedLog.params) return selectedLog.params
    if (selectedLog.prompt) {
      try {
        return typeof selectedLog.prompt === 'string' ? JSON.parse(selectedLog.prompt) : selectedLog.prompt
      } catch {}
    }
    return {}
  }, [selectedLog])

  const userSubmission = useMemo(() => {
    if (!selectedLog) return ''
    return (
      selectedLog.userSubmission ||
      selectedLog.metadata?.userSubmission ||
      logParams.userAnswer ||
      ''
    )
  }, [selectedLog, logParams])

  const evalResult = useMemo(() => {
    if (!selectedLog) return null
    if (selectedLog.evalResult) return selectedLog.evalResult
    if (selectedLog.metadata?.evalResult) return selectedLog.metadata.evalResult
    if (selectedLog.type === 'writing_eval' && logContent) return logContent
    return null
  }, [selectedLog, logContent])

  const writingSourceText = useMemo(() => {
    if (!selectedLog) return ''
    if (selectedLog.type === 'writing' && logContent?.sourceText) {
      return logContent.sourceText
    }
    if (logParams.sourceText) {
      return logParams.sourceText
    }
    if (logContent?.sourceText) {
      return logContent.sourceText
    }
    return ''
  }, [selectedLog, logContent, logParams])

  const writingScore = useMemo(() => {
    if (!selectedLog) return undefined
    if (selectedLog.score !== undefined) return selectedLog.score
    if (selectedLog.metadata?.score !== undefined) return selectedLog.metadata.score
    if (evalResult?.score !== undefined) return evalResult.score
    return undefined
  }, [selectedLog, evalResult])

  const { data, isLoading, isError } = useQuery<HistoryResponse>({
    queryKey: ['ai-history', page, typeFilter, search],
    queryFn: () => fetchAIHistory(page, typeFilter, search),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/ai/history/${id}`, {
        method: 'DELETE',
        headers: withCsrfHeaders(),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Lỗi xóa lịch sử')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Đã xóa bản ghi lịch sử thành công')
      queryClient.invalidateQueries({ queryKey: ['ai-history'] })
      if (selectedLog) setSelectedLog(null)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Không thể xóa bản ghi lịch sử')
    },
  })

  return {
    page, setPage,
    typeFilter, setTypeFilter,
    search, setSearch,
    selectedLog, setSelectedLog,
    logContent,
    logParams,
    userSubmission,
    evalResult,
    writingSourceText,
    writingScore,
    showParagraphTranslation, setShowParagraphTranslation,
    showStoryTranslation, setShowStoryTranslation,
    flashcardIndex, setFlashcardIndex,
    isFlipped, setIsFlipped,
    showHint, setShowHint,
    deletingLogId, setDeletingLogId,
    writingModalSubTab, setWritingModalSubTab,
    data,
    isLoading,
    isError,
    deleteMutation,
  }
}
