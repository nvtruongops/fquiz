'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bot, Save, Loader2 } from 'lucide-react'

interface LLMSettingsCardProps {
  activeProvider: 'gemini' | 'openai' | 'custom'
  setActiveProvider: (provider: 'gemini' | 'openai' | 'custom') => void
  onSave: () => void
  isSaving: boolean
}

export const LLMSettingsCard = React.memo(function LLMSettingsCard({
  activeProvider,
  setActiveProvider,
  onSave,
  isSaving,
}: LLMSettingsCardProps) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
      <Card className="border-border bg-card shadow-xs text-card-foreground">
        <CardHeader>
          <CardTitle className="text-primary text-lg flex items-center gap-2">
            <Bot className="w-5 h-5" aria-hidden="true" /> Active AI Provider
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
                  activeProvider === p
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-card-foreground hover:bg-muted'
                }`}
              >
                <span>{p}</span>
                {activeProvider === p && (
                  <span className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md px-6 rounded-xl cursor-pointer"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
          ) : (
            <Save className="w-4 h-4 mr-2" aria-hidden="true" />
          )}
          Save LLM Settings
        </Button>
      </div>
    </div>
  )
})
