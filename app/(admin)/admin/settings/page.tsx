'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import {
  SlidersHorizontal,
  ShieldAlert,
  KeyRound,
  Globe,
  Save,
  Loader2,
  Bot,
  CheckCircle2,
  Cpu,
  Sparkles,
  Server,
  Zap,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { ShieldCheck } from 'lucide-react'

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

interface Settings {
  _id: string
  app_name: string
  app_description: string
  allow_registration: boolean
  maintenance_mode: boolean
  anti_sharing_enabled: boolean
  anti_sharing_max_violations: number
  llm_config?: LLMConfig
}

const DEFAULT_LLM_CONFIG: LLMConfig = {
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

export default function AdminSettingsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'llm'>('general')
  const [formState, setFormState] = useState<Partial<Settings>>({})
  const [testingProvider, setTestingProvider] = useState<'openai' | 'gemini' | 'custom' | null>(null)
  const [savingProvider, setSavingProvider] = useState<'openai' | 'gemini' | 'custom' | 'general' | 'security' | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)

  // UI Expand / Collapse states
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
    // Lưu ngay lập tức vào database
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

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#5D7B6F] animate-spin" />
      </div>
    )
  }

  const llmConfig = formState.llm_config ?? DEFAULT_LLM_CONFIG
  const isAllExpanded = expandedProviders.gemini && expandedProviders.openai && expandedProviders.custom

  return (
    <div className="p-8 pb-24">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#5D7B6F]">Cấu hình Hệ thống</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý tham số toàn cục, bảo mật và dịch vụ AI/LLM</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Vertical Tabs Sidebar (Collapsible) */}
          <div
            className={`w-full shrink-0 transition-all duration-300 flex flex-col gap-2 ${
              isSidebarCollapsed ? 'md:w-16' : 'md:w-64'
            }`}
          >
            <div className="flex items-center justify-between px-2 pb-1">
              {!isSidebarCollapsed && (
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Danh mục</span>
              )}
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-[#EAE7D6] hover:text-[#5D7B6F] transition-colors ml-auto hidden md:block"
                title={isSidebarCollapsed ? 'Mở rộng sidebar' : 'Thu nhỏ sidebar'}
              >
                {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => setActiveTab('general')}
              title="Hiển thị chung"
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium transition-colors text-sm text-left
                ${activeTab === 'general'
                  ? 'bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20'
                  : 'text-gray-600 hover:bg-[#EAE7D6] hover:text-[#5D7B6F]'}`}
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Hiển thị chung</span>}
            </button>

            <button
              onClick={() => setActiveTab('security')}
              title="Bảo mật & Thi cử"
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium transition-colors text-sm text-left
                ${activeTab === 'security'
                  ? 'bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20'
                  : 'text-gray-600 hover:bg-[#EAE7D6] hover:text-[#5D7B6F]'}`}
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Bảo mật &amp; Thi cử</span>}
            </button>

            <button
              onClick={() => setActiveTab('llm')}
              title="Cấu hình LLM / AI"
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium transition-colors text-sm text-left
                ${activeTab === 'llm'
                  ? 'bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20'
                  : 'text-gray-600 hover:bg-[#EAE7D6] hover:text-[#5D7B6F]'}`}
            >
              <Bot className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Cấu hình LLM / AI</span>}
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 w-full space-y-6">

            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <Card className="border-[#A4C3A2] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-[#5D7B6F] text-lg flex items-center gap-2">
                      <Globe className="w-5 h-5" /> Thông tin Dự án
                    </CardTitle>
                    <CardDescription>Cấu hình các thông tin công khai hiển thị trên trang chủ</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <label htmlFor="app_name" className="text-sm font-semibold text-gray-700 ml-1">Tên ứng dụng</label>
                      <Input
                        id="app_name"
                        value={formState.app_name ?? ''}
                        onChange={(e) => setFormState((s) => ({ ...s, app_name: e.target.value }))}
                        className="border-gray-200 focus:border-[#5D7B6F] focus:ring-[#5D7B6F]/20 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="app_description" className="text-sm font-semibold text-gray-700 ml-1">Mô tả ngắn (SEO)</label>
                      <textarea
                        id="app_description"
                        rows={3}
                        value={formState.app_description ?? ''}
                        onChange={(e) => setFormState((s) => ({ ...s, app_description: e.target.value }))}
                        className="w-full resize-none border-2 px-4 py-3 text-[15px] outline-none transition-all duration-200 border-gray-200 focus:border-[#5D7B6F] rounded-xl"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#A4C3A2] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-[#5D7B6F] text-lg flex items-center gap-2">Giao diện (Maintenance)</CardTitle>
                    <CardDescription>Quản lý trạng thái bảo trì của hệ thống</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-xl">
                      <div>
                        <h4 className="font-bold text-orange-800">Chế độ bảo trì hệ thống</h4>
                        <p className="text-sm text-orange-600 mt-1">Đóng toàn bộ tính năng và hiển thị trang thông báo Đang Nâng Cấp.</p>
                      </div>
                      <button
                        onClick={() => setFormState((s) => ({ ...s, maintenance_mode: !s.maintenance_mode }))}
                        className={`w-14 h-8 rounded-full relative transition-colors ${formState.maintenance_mode ? 'bg-orange-500' : 'bg-gray-200'}`}
                        aria-label="Bật/tắt chế độ bảo trì"
                      >
                        <div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-sm transition-transform ${formState.maintenance_mode ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => handleSaveAll('general')}
                    disabled={saveMutation.isPending}
                    className="bg-[#5D7B6F] hover:bg-[#4a6358] shadow-md px-6 rounded-xl"
                  >
                    {saveMutation.isPending && savingProvider === 'general' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Lưu cấu hình Hiển thị
                  </Button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <Card className="border-[#A4C3A2] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-[#5D7B6F] text-lg flex items-center gap-2">
                      <KeyRound className="w-5 h-5" /> Cấu hình Sinh viên
                    </CardTitle>
                    <CardDescription>Kiểm soát quy tắc đăng ký và phiên làm việc</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl">
                      <div>
                        <h4 className="font-bold text-gray-800">Cho phép tạo mới tài khoản</h4>
                        <p className="text-sm text-gray-500 mt-1">Học viên có thể trực tiếp đăng ký qua trang Register.</p>
                      </div>
                      <button
                        onClick={() => setFormState((s) => ({ ...s, allow_registration: !s.allow_registration }))}
                        className={`w-14 h-8 rounded-full relative transition-colors ${formState.allow_registration ? 'bg-[#A4C3A2]' : 'bg-gray-200'}`}
                        aria-label="Bật/tắt đăng ký tài khoản"
                      >
                        <div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-sm transition-transform ${formState.allow_registration ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl">
                      <div>
                        <h4 className="font-bold text-gray-800">Chống chia sẻ tài khoản</h4>
                        <p className="text-sm text-gray-500 mt-1">Tự động ban khi phát hiện nhiều thiết bị cùng đăng nhập (tính từ thứ 2 theo giờ VN).</p>
                      </div>
                      <button
                        onClick={() => setFormState((s) => ({ ...s, anti_sharing_enabled: !s.anti_sharing_enabled }))}
                        className={`w-14 h-8 rounded-full relative transition-colors ${formState.anti_sharing_enabled ? 'bg-[#A4C3A2]' : 'bg-gray-200'}`}
                        aria-label="Bật/tắt chống chia sẻ tài khoản"
                      >
                        <div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-sm transition-transform ${formState.anti_sharing_enabled ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {formState.anti_sharing_enabled && (
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-3 animate-in fade-in duration-200">
                        <label htmlFor="max_violations" className="text-sm font-semibold text-amber-800">
                          Ngưỡng vi phạm tối đa / tuần (Thứ 2 → Chủ nhật, giờ VN)
                        </label>
                        <Input
                          id="max_violations"
                          type="number"
                          min={3}
                          max={50}
                          value={formState.anti_sharing_max_violations ?? 10}
                          onChange={(e) => setFormState((s) => ({ ...s, anti_sharing_max_violations: Number.parseInt(e.target.value, 10) || 10 }))}
                          className="w-32 border-amber-200 focus:border-amber-500 focus:ring-amber-500/20 rounded-xl"
                        />
                        <p className="text-xs text-amber-600">
                          Nếu số lượng thiết bị (IP + User-Agent) duy nhất vượt ngưỡng này trong 1 tuần, học viên sẽ bị tự động khóa tài khoản.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => handleSaveAll('security')}
                    disabled={saveMutation.isPending}
                    className="bg-[#5D7B6F] hover:bg-[#4a6358] shadow-md px-6 rounded-xl"
                  >
                    {saveMutation.isPending && savingProvider === 'security' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Lưu cấu hình Bảo mật
                  </Button>
                </div>
              </div>
            )}

            {/* LLM / AI Config Tab */}
            {activeTab === 'llm' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                {/* Active Overview Card + Controls */}
                <Card className="border-[#5D7B6F]/30 bg-[#5D7B6F]/5 shadow-sm">
                  <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#5D7B6F] text-white flex items-center justify-center font-bold shadow-sm">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#5D7B6F] text-base">LLM Provider Đang Kích Hoạt</h4>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Tất cả tác vụ sinh từ vựng, ngữ pháp và bài tập AI sẽ sử dụng Provider này.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#5D7B6F] text-white shadow-sm uppercase">
                        <Zap className="w-3.5 h-3.5 fill-current" /> {llmConfig.active_provider}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAllProviders(!isAllExpanded)}
                        className="text-xs border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-xl flex items-center gap-1.5 shadow-xs"
                      >
                        {isAllExpanded ? (
                          <>
                            <Minimize2 className="w-3.5 h-3.5" /> Thu nhỏ tất cả
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-3.5 h-3.5" /> Mở rộng tất cả
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 1. Google Gemini */}
                <Card className={`border-2 transition-all shadow-sm overflow-hidden ${llmConfig.active_provider === 'gemini' ? 'border-[#5D7B6F] bg-emerald-50/20' : 'border-gray-200'}`}>
                  <CardHeader
                    className="flex flex-row items-center justify-between py-4 px-5 cursor-pointer select-none hover:bg-gray-50/50 transition-colors"
                    onClick={() => toggleProviderExpand('gemini')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-gray-800 font-bold flex items-center gap-2">
                          Google Gemini API
                          {llmConfig.active_provider === 'gemini' && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Đang dùng
                            </span>
                          )}
                        </CardTitle>
                        {!expandedProviders.gemini && (
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            Model: {llmConfig.gemini?.model || 'gemini-2.0-flash-001'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {llmConfig.active_provider !== 'gemini' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveProvider('gemini')}
                          className="text-xs border-[#5D7B6F] text-[#5D7B6F] hover:bg-[#5D7B6F] hover:text-white rounded-xl"
                        >
                          Chuyển dùng Gemini
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleProviderExpand('gemini')}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        aria-label="Thu nhỏ/Mở rộng"
                      >
                        {expandedProviders.gemini ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </CardHeader>

                  {expandedProviders.gemini && (
                    <CardContent className="space-y-4 pt-2 pb-5 border-t border-gray-100 animate-in fade-in duration-200">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-gray-700">Gemini API Key</label>
                          {llmConfig.gemini?.hasApiKey && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Đã cấu hình ({llmConfig.gemini.apiKeyMasked || '••••••••'})
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type={showApiKeys.gemini ? 'text' : 'password'}
                            placeholder={
                              llmConfig.gemini?.hasApiKey
                                ? `${llmConfig.gemini.apiKeyMasked || '••••••••'} (Đã bảo mật - Nhập mới để ghi đè)`
                                : 'AIzaSy... (Để trống nếu sử dụng process.env.GEMINI_API_KEY)'
                            }
                            value={llmConfig.gemini?.apiKey ?? ''}
                            onChange={(e) => updateLLMField('gemini', 'apiKey', e.target.value)}
                            className="border-gray-200 focus:border-[#5D7B6F] rounded-xl font-mono text-xs pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => toggleShowApiKey('gemini')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showApiKeys.gemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          🔒 Bảo mật: Khóa API được mã hóa AES-256-GCM trong DB và không bao giờ hiển thị lại. Để giữ nguyên khóa cũ, hãy để trống ô này.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Tên Model</label>
                        <Input
                          placeholder="gemini-2.0-flash-001"
                          value={llmConfig.gemini?.model ?? 'gemini-2.0-flash-001'}
                          onChange={(e) => updateLLMField('gemini', 'model', e.target.value)}
                          className="border-gray-200 focus:border-[#5D7B6F] rounded-xl text-sm"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={testingProvider === 'gemini'}
                          onClick={() => handleTestLLM('gemini')}
                          className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs"
                        >
                          {testingProvider === 'gemini' ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
                          Kiểm tra kết nối
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={saveMutation.isPending}
                          onClick={() => handleSaveAll('gemini')}
                          className="bg-[#5D7B6F] hover:bg-[#4a6358] text-white rounded-xl text-xs shadow-sm"
                        >
                          {saveMutation.isPending && savingProvider === 'gemini' ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                          Lưu cấu hình Gemini
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* 2. OpenAI */}
                <Card className={`border-2 transition-all shadow-sm overflow-hidden ${llmConfig.active_provider === 'openai' ? 'border-[#5D7B6F] bg-emerald-50/20' : 'border-gray-200'}`}>
                  <CardHeader
                    className="flex flex-row items-center justify-between py-4 px-5 cursor-pointer select-none hover:bg-gray-50/50 transition-colors"
                    onClick={() => toggleProviderExpand('openai')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-gray-800 font-bold flex items-center gap-2">
                          OpenAI API
                          {llmConfig.active_provider === 'openai' && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Đang dùng
                            </span>
                          )}
                        </CardTitle>
                        {!expandedProviders.openai && (
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            Model: {llmConfig.openai?.model || 'gpt-4o-mini'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {llmConfig.active_provider !== 'openai' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveProvider('openai')}
                          className="text-xs border-[#5D7B6F] text-[#5D7B6F] hover:bg-[#5D7B6F] hover:text-white rounded-xl"
                        >
                          Chuyển dùng OpenAI
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleProviderExpand('openai')}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        aria-label="Thu nhỏ/Mở rộng"
                      >
                        {expandedProviders.openai ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </CardHeader>

                  {expandedProviders.openai && (
                    <CardContent className="space-y-4 pt-2 pb-5 border-t border-gray-100 animate-in fade-in duration-200">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-gray-700">OpenAI API Key</label>
                          {llmConfig.openai?.hasApiKey && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 shadow-2xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                              Đã cấu hình ({llmConfig.openai.apiKeyMasked || '••••••••'})
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type={showApiKeys.openai ? 'text' : 'password'}
                            placeholder={
                              llmConfig.openai?.hasApiKey
                                ? `${llmConfig.openai.apiKeyMasked || '••••••••'} (Đã bảo mật - Nhập mới để ghi đè)`
                                : 'sk-proj-... (Để trống nếu sử dụng process.env.OPENAI_API_KEY)'
                            }
                            value={llmConfig.openai?.apiKey ?? ''}
                            onChange={(e) => updateLLMField('openai', 'apiKey', e.target.value)}
                            className="border-gray-200 focus:border-[#5D7B6F] rounded-xl font-mono text-xs pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => toggleShowApiKey('openai')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showApiKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          🔒 Bảo mật: Khóa API được mã hóa AES-256-GCM trong DB và không bao giờ hiển thị lại. Để giữ nguyên khóa cũ, hãy để trống ô này.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Tên Model</label>
                        <Input
                          placeholder="gpt-4o-mini"
                          value={llmConfig.openai?.model ?? 'gpt-4o-mini'}
                          onChange={(e) => updateLLMField('openai', 'model', e.target.value)}
                          className="border-gray-200 focus:border-[#5D7B6F] rounded-xl text-sm"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={testingProvider === 'openai'}
                          onClick={() => handleTestLLM('openai')}
                          className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs"
                        >
                          {testingProvider === 'openai' ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
                          Kiểm tra kết nối
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={saveMutation.isPending}
                          onClick={() => handleSaveAll('openai')}
                          className="bg-[#5D7B6F] hover:bg-[#4a6358] text-white rounded-xl text-xs shadow-sm"
                        >
                          {saveMutation.isPending && savingProvider === 'openai' ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                          Lưu cấu hình OpenAI
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* 3. Custom LLM */}
                <Card className={`border-2 transition-all shadow-sm overflow-hidden ${llmConfig.active_provider === 'custom' ? 'border-[#5D7B6F] bg-emerald-50/20' : 'border-gray-200'}`}>
                  <CardHeader
                    className="flex flex-row items-center justify-between py-4 px-5 cursor-pointer select-none hover:bg-gray-50/50 transition-colors"
                    onClick={() => toggleProviderExpand('custom')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                        <Server className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-gray-800 font-bold flex items-center gap-2">
                          Custom OpenAI-Compatible LLM
                          {llmConfig.active_provider === 'custom' && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Đang dùng
                            </span>
                          )}
                        </CardTitle>
                        {!expandedProviders.custom && (
                          <p className="text-xs text-gray-500 font-mono mt-0.5 truncate max-w-xs sm:max-w-md">
                            URL: {llmConfig.custom?.baseUrl || 'Chưa cấu hình'} {llmConfig.custom?.model ? `(${llmConfig.custom.model})` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {llmConfig.active_provider !== 'custom' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveProvider('custom')}
                          className="text-xs border-[#5D7B6F] text-[#5D7B6F] hover:bg-[#5D7B6F] hover:text-white rounded-xl"
                        >
                          Chuyển dùng Custom LLM
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleProviderExpand('custom')}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        aria-label="Thu nhỏ/Mở rộng"
                      >
                        {expandedProviders.custom ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </CardHeader>

                  {expandedProviders.custom && (
                    <CardContent className="space-y-4 pt-2 pb-5 border-t border-gray-100 animate-in fade-in duration-200">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Base URL Endpoint</label>
                        <Input
                          placeholder="https://api.together.xyz/v1 hoặc http://localhost:11434/v1"
                          value={llmConfig.custom?.baseUrl ?? ''}
                          onChange={(e) => updateLLMField('custom', 'baseUrl', e.target.value)}
                          className="border-gray-200 focus:border-[#5D7B6F] rounded-xl text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-gray-700">API Key (Nếu có)</label>
                          {llmConfig.custom?.hasApiKey && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 shadow-2xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                              Đã cấu hình ({llmConfig.custom.apiKeyMasked || '••••••••'})
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type={showApiKeys.custom ? 'text' : 'password'}
                            placeholder={
                              llmConfig.custom?.hasApiKey
                                ? `${llmConfig.custom.apiKeyMasked || '••••••••'} (Đã bảo mật - Nhập mới để ghi đè)`
                                : 'Bearer token hoặc API Key...'
                            }
                            value={llmConfig.custom?.apiKey ?? ''}
                            onChange={(e) => updateLLMField('custom', 'apiKey', e.target.value)}
                            className="border-gray-200 focus:border-[#5D7B6F] rounded-xl font-mono text-xs pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => toggleShowApiKey('custom')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showApiKeys.custom ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          🔒 Bảo mật: Khóa API được mã hóa AES-256-GCM trong DB và không bao giờ hiển thị lại. Để giữ nguyên khóa cũ, hãy để trống ô này.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Tên Model Custom</label>
                        <Input
                          placeholder="deepseek-chat, llama3, mistral..."
                          value={llmConfig.custom?.model ?? ''}
                          onChange={(e) => updateLLMField('custom', 'model', e.target.value)}
                          className="border-gray-200 focus:border-[#5D7B6F] rounded-xl text-sm"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={testingProvider === 'custom'}
                          onClick={() => handleTestLLM('custom')}
                          className="border-indigo-600 text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs"
                        >
                          {testingProvider === 'custom' ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
                          Kiểm tra kết nối
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={saveMutation.isPending}
                          onClick={() => handleSaveAll('custom')}
                          className="bg-[#5D7B6F] hover:bg-[#4a6358] text-white rounded-xl text-xs shadow-sm"
                        >
                          {saveMutation.isPending && savingProvider === 'custom' ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                          Lưu cấu hình Custom LLM
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
