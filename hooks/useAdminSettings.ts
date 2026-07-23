'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

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
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''
  const res = await fetch(`${base}/api/admin/settings?_=${Date.now()}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch settings')
  return res.json()
}

async function saveSettings(updates: Partial<Settings>): Promise<{ settings: Settings }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/settings`, {
    method: 'PUT',
    credentials: 'include',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
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
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'llm'>('general')
  const [formState, setFormState] = useState<Partial<Settings>>({})
  const [testingProvider, setTestingProvider] = useState<'openai' | 'gemini' | 'custom' | null>(null)
  const [savingProvider, setSavingProvider] = useState<'openai' | 'gemini' | 'custom' | 'general' | 'security' | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [expandedProviders, setExpandedProviders] = useState<Record<'gemini' | 'openai' | 'custom', boolean>>({
    gemini: false,
    openai: false,
    custom: false,
  })
  const [showApiKeys, setShowApiKeys] = useState<Record<'gemini' | 'openai' | 'custom', boolean>>({
    gemini: false,
    openai: false,
    custom: false,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: fetchSettings,
    staleTime: 0,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
      if (!hasInitialized) {
        setHasInitialized(true)
      }
    }
  }, [data, hasInitialized])

  const saveMutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'settings'], data)
      if (data?.settings) {
        setFormState((prev) => ({
          ...prev,
          ...data.settings,
          llm_config: {
            ...DEFAULT_LLM_CONFIG,
            ...data.settings.llm_config,
            openai: { ...DEFAULT_LLM_CONFIG.openai, ...data.settings.llm_config?.openai },
            gemini: { ...DEFAULT_LLM_CONFIG.gemini, ...data.settings.llm_config?.gemini },
            custom: { ...DEFAULT_LLM_CONFIG.custom, ...data.settings.llm_config?.custom },
          },
        }))
      }
      toast.success('Đã lưu cấu hình thành công!')
      setSavingProvider(null)
    },
    onError: (err: Error) => {
      toast.error(err.message)
      setSavingProvider(null)
    },
  })

  const handleSaveAll = (providerScope?: 'openai' | 'gemini' | 'custom' | 'general' | 'security') => {
    setSavingProvider(providerScope || null)
    const updates: Partial<Settings> = {
      app_name: formState.app_name,
      app_description: formState.app_description,
      allow_registration: formState.allow_registration,
      maintenance_mode: formState.maintenance_mode,
      anti_sharing_enabled: formState.anti_sharing_enabled,
      anti_sharing_max_violations: formState.anti_sharing_max_violations,
      llm_config: formState.llm_config,
    }
    saveMutation.mutate(updates)
  }

  const handleTestLLM = async (provider: 'openai' | 'gemini' | 'custom') => {
    setTestingProvider(provider)
    try {
      const config = formState.llm_config?.[provider] ?? {}
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/settings/test-llm`, {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          provider,
          ...config,
        }),
      })
      const resData = await res.json()
      if (!res.ok || !resData.success) {
        toast.error(resData.error || `Kiểm tra kết nối thất bại`)
      } else {
        toast.success(resData.message || `Kết nối thành công tới ${provider.toUpperCase()}!`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi mạng khi kiểm tra kết nối')
    } finally {
      setTestingProvider(null)
    }
  }

  const setActiveProvider = (provider: 'openai' | 'gemini' | 'custom') => {
    const updatedLLMConfig: LLMConfig = {
      ...DEFAULT_LLM_CONFIG,
      ...formState.llm_config,
      active_provider: provider,
    }
    setFormState((s) => ({
      ...s,
      llm_config: updatedLLMConfig,
    }))
    setSavingProvider(provider)
    saveMutation.mutate({
      llm_config: updatedLLMConfig,
    })
  }

  const updateLLMField = (
    provider: 'openai' | 'gemini' | 'custom',
    field: string,
    value: string
  ) => {
    setFormState((s) => {
      const current = s.llm_config ?? DEFAULT_LLM_CONFIG
      return {
        ...s,
        llm_config: {
          ...current,
          [provider]: {
            ...current[provider],
            [field]: value,
          },
        },
      }
    })
  }

  const toggleProviderExpand = (provider: 'gemini' | 'openai' | 'custom') => {
    setExpandedProviders((prev) => ({ ...prev, [provider]: !prev[provider] }))
  }

  const toggleAllProviders = (expand: boolean) => {
    setExpandedProviders({ gemini: expand, openai: expand, custom: expand })
  }

  const toggleShowApiKey = (provider: 'gemini' | 'openai' | 'custom') => {
    setShowApiKeys((prev) => ({ ...prev, [provider]: !prev[provider] }))
  }

  return {
    activeTab, setActiveTab,
    formState, setFormState,
    testingProvider,
    savingProvider,
    isLoading,
    isSidebarCollapsed, setIsSidebarCollapsed,
    expandedProviders,
    showApiKeys,
    saveMutation,
    handleSaveAll,
    handleTestLLM,
    setActiveProvider,
    updateLLMField,
    toggleProviderExpand,
    toggleAllProviders,
    toggleShowApiKey,
  }
}
