'use client'

import React from 'react'
import { SlidersHorizontal, ShieldAlert, Loader2, Bot, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAdminSettings, DEFAULT_LLM_CONFIG } from '@/hooks/useAdminSettings'
import { GeneralSettingsCard } from '@/components/settings/GeneralSettingsCard'
import { SecuritySettingsCard } from '@/components/settings/SecuritySettingsCard'
import { LLMSettingsCard } from '@/components/settings/LLMSettingsCard'

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
        <Loader2 className="w-8 h-8 text-primary animate-spin" aria-hidden="true" />
      </div>
    )
  }

  const llmConfig = formState.llm_config ?? DEFAULT_LLM_CONFIG

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage global parameters, security policies, and AI/LLM providers</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Vertical Tabs Sidebar */}
        <div
          className={`w-full shrink-0 transition-all duration-300 flex flex-col gap-2 ${
            isSidebarCollapsed ? 'md:w-16' : 'md:w-64'
          }`}
        >
          <div className="flex items-center justify-between px-2 pb-1">
            {!isSidebarCollapsed && (
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Navigation</span>
            )}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-primary transition-colors ml-auto hidden md:block cursor-pointer"
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" aria-hidden="true" /> : <PanelLeftClose className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>

          <button
            onClick={() => setActiveTab('general')}
            aria-label="General Settings"
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium transition-colors text-sm text-left cursor-pointer
              ${activeTab === 'general' ? 'bg-primary text-primary-foreground shadow-sm font-semibold' : 'text-card-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" aria-hidden="true" />
            {!isSidebarCollapsed && <span>General</span>}
          </button>

          <button
            onClick={() => setActiveTab('security')}
            aria-label="Security & Exams"
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium transition-colors text-sm text-left cursor-pointer
              ${activeTab === 'security' ? 'bg-primary text-primary-foreground shadow-sm font-semibold' : 'text-card-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
            {!isSidebarCollapsed && <span>Security &amp; Exams</span>}
          </button>

          <button
            onClick={() => setActiveTab('llm')}
            aria-label="AI & LLM Settings"
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium transition-colors text-sm text-left cursor-pointer
              ${activeTab === 'llm' ? 'bg-primary text-primary-foreground shadow-sm font-semibold' : 'text-card-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <Bot className="w-4 h-4 shrink-0" aria-hidden="true" />
            {!isSidebarCollapsed && <span>AI &amp; LLM</span>}
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 w-full space-y-6">
          {activeTab === 'general' && (
            <GeneralSettingsCard
              formState={formState}
              setFormState={setFormState}
              onSave={() => handleSaveAll('general')}
              isSaving={saveMutation.isPending && savingProvider === 'general'}
            />
          )}

          {activeTab === 'security' && (
            <SecuritySettingsCard
              formState={formState}
              setFormState={setFormState}
              onSave={() => handleSaveAll('security')}
              isSaving={saveMutation.isPending && savingProvider === 'security'}
            />
          )}

          {activeTab === 'llm' && (
            <LLMSettingsCard
              activeProvider={llmConfig.active_provider}
              setActiveProvider={setActiveProvider}
              onSave={() => handleSaveAll('llm')}
              isSaving={saveMutation.isPending && savingProvider === 'llm'}
            />
          )}
        </div>
      </div>
    </div>
  )
}
