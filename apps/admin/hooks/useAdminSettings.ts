'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/useToast'

export interface LLMProviderConfig {
  apiKey: string
  model: string
  hasApiKey?: boolean
  apiKeyMasked?: string
}

export interface LLMConfig {
  active_provider: 'openai' | 'gemini' | 'custom'
  openai: LLMProviderConfig
  gemini: LLMProviderConfig
  custom: LLMProviderConfig & { baseUrl: string }
}

export interface Settings {
  _id: string
  app_name: string
  app_description: string
  allow_registration: boolean
  maintenance_mode: boolean
  anti_sharing_enabled: boolean
  anti_sharing_max_violations: number
  llm_config?: LLMConfig
}

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  active_provider: 'gemini',
  openai: { apiKey: '', model: 'gpt-4o-mini' },
  gemini: { apiKey: '', model: 'gemini-2.0-flash-001' },
  custom: { baseUrl: '', apiKey: '', model: '' },
}

async function fetchSettings(): Promise<{ settings: Settings }> {
  const res = await fetch(`/api/settings?_=${Date.now()}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch settings')
  return res.json()
}

async function saveSettings(updates: Partial<Settings>): Promise<{ settings: Settings }> {
  const res = await fetch(`/api/settings`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? 'Save failed')
  }
  return res.json()
}

export function useAdminSettings() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'llm'>('general')
  const [formState, setFormState] = useState<Partial<Settings>>({})
  const [savingProvider, setSavingProvider] = useState<'general' | 'security' | 'llm' | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: fetchSettings,
    staleTime: 0,
  })

  useEffect(() => {
    if (data?.settings) {
      setFormState({
        ...data.settings,
        llm_config: {
          ...DEFAULT_LLM_CONFIG,
          ...data.settings.llm_config,
          openai: { ...DEFAULT_LLM_CONFIG.openai, ...data.settings.llm_config?.openai },
          gemini: { ...DEFAULT_LLM_CONFIG.gemini, ...data.settings.llm_config?.gemini },
          custom: { ...DEFAULT_LLM_CONFIG.custom, ...data.settings.llm_config?.custom },
        },
      })
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: (res) => {
      queryClient.setQueryData(['admin', 'settings'], res)
      toast({ title: 'Thành công', description: 'Đã lưu cấu hình hệ thống!', type: 'success' })
      setSavingProvider(null)
    },
    onError: (err: Error) => {
      toast({ title: 'Lỗi', description: err.message || 'Không thể lưu cài đặt', type: 'error' })
      setSavingProvider(null)
    },
  })

  const handleSaveAll = (providerScope?: 'general' | 'security' | 'llm') => {
    if (providerScope) setSavingProvider(providerScope)
    saveMutation.mutate(formState)
  }

  const setActiveProvider = (provider: 'openai' | 'gemini' | 'custom') => {
    setFormState((prev) => ({
      ...prev,
      llm_config: {
        ...(prev.llm_config ?? DEFAULT_LLM_CONFIG),
        active_provider: provider,
      },
    }))
  }

  return {
    activeTab,
    setActiveTab,
    formState,
    setFormState,
    savingProvider,
    isLoading,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    saveMutation,
    handleSaveAll,
    setActiveProvider,
  }
}
