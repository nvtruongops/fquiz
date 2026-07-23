'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { SlidersHorizontal, ShieldAlert, Save, Loader2, Bot, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

import { useAdminSettings, DEFAULT_LLM_CONFIG } from '@/hooks/useAdminSettings'
import { GeneralSettingsCard } from '@/components/admin/settings/GeneralSettingsCard'
import { SecuritySettingsCard } from '@/components/admin/settings/SecuritySettingsCard'

export default function AdminSettingsPage() {
  const {
    activeTab, setActiveTab,
    formState, setFormState,
    savingProvider,
    isLoading,
    isSidebarCollapsed, setIsSidebarCollapsed,
    saveMutation,
    handleSaveAll,
    setActiveProvider,
  } = useAdminSettings()

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#5D7B6F] animate-spin" />
      </div>
    )
  }

  const llmConfig = formState.llm_config ?? DEFAULT_LLM_CONFIG

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
              <GeneralSettingsCard
                formState={formState}
                setFormState={setFormState}
                onSave={() => handleSaveAll('general')}
                isSaving={saveMutation.isPending && savingProvider === 'general'}
              />
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <SecuritySettingsCard
                formState={formState}
                setFormState={setFormState}
                onSave={() => handleSaveAll('security')}
                isSaving={saveMutation.isPending && savingProvider === 'security'}
              />
            )}

            {/* LLM Tab */}
            {activeTab === 'llm' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <Card className="border-[#A4C3A2] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-[#5D7B6F] text-lg flex items-center gap-2">
                      <Bot className="w-5 h-5" /> Provider AI đang kích hoạt
                    </CardTitle>
                    <CardDescription>Chọn Provider AI sẽ xử lý các yêu cầu tự động trong toàn hệ thống</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(['gemini', 'openai', 'custom'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setActiveProvider(p)}
                          className={`p-4 rounded-xl border-2 font-bold text-xs capitalize flex items-center justify-between transition-all ${
                            llmConfig.active_provider === p
                              ? 'border-[#5D7B6F] bg-emerald-50/50 text-[#5D7B6F]'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>{p}</span>
                          {llmConfig.active_provider === p && <span className="w-2.5 h-2.5 bg-[#5D7B6F] rounded-full animate-pulse" />}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => handleSaveAll('general')}
                    disabled={saveMutation.isPending}
                    className="bg-[#5D7B6F] hover:bg-[#4a6358] shadow-md px-6 rounded-xl"
                  >
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Lưu tất cả cấu hình
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
