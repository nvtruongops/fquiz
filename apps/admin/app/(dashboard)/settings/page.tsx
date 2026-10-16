'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SlidersHorizontal, ShieldAlert, Save, Loader2, Bot, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAdminSettings, DEFAULT_LLM_CONFIG } from '@/hooks/useAdminSettings'
import { GeneralSettingsCard } from '@/components/settings/GeneralSettingsCard'
import { SecuritySettingsCard } from '@/components/settings/SecuritySettingsCard'

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
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
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
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={() => setActiveTab('general')}
            title="General Settings"
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium transition-colors text-sm text-left cursor-pointer
              ${activeTab === 'general'
                ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                : 'text-card-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>General</span>}
          </button>

          <button
            onClick={() => setActiveTab('security')}
            title="Security & Exams"
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium transition-colors text-sm text-left cursor-pointer
              ${activeTab === 'security'
                ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                : 'text-card-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Security &amp; Exams</span>}
          </button>

          <button
            onClick={() => setActiveTab('llm')}
            title="AI & LLM Settings"
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium transition-colors text-sm text-left cursor-pointer
              ${activeTab === 'llm'
                ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                : 'text-card-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <Bot className="w-4 h-4 shrink-0" />
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
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
              <Card className="border-border bg-card shadow-xs text-card-foreground">
                <CardHeader>
                  <CardTitle className="text-primary text-lg flex items-center gap-2">
                    <Bot className="w-5 h-5" /> Active AI Provider
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Select the AI provider that powers text generation across the platform
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(['gemini', 'openai', 'custom'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setActiveProvider(p)}
                        className={`p-4 rounded-xl border-2 font-bold text-xs capitalize flex items-center justify-between transition-all cursor-pointer ${
                          llmConfig.active_provider === p
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-card-foreground hover:bg-muted'
                        }`}
                      >
                        <span>{p}</span>
                        {llmConfig.active_provider === p && <span className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => handleSaveAll('llm')}
                  disabled={saveMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md px-6 rounded-xl cursor-pointer"
                >
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save LLM Settings
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
