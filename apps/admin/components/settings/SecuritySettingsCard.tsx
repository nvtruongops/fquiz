'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { KeyRound, Save, Loader2 } from 'lucide-react'
import { Settings } from '@/hooks/useAdminSettings'

interface SecuritySettingsCardProps {
  formState: Partial<Settings>
  setFormState: React.Dispatch<React.SetStateAction<Partial<Settings>>>
  onSave: () => void
  isSaving: boolean
}

export const SecuritySettingsCard = React.memo(function SecuritySettingsCard({
  formState,
  setFormState,
  onSave,
  isSaving,
}: SecuritySettingsCardProps) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
      <Card className="border-border bg-card text-card-foreground shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground text-base font-bold flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" /> Registration &amp; Security Rules
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs">Manage student registration rules and active sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/40 border border-border rounded-xl">
            <div className="space-y-1 pr-4">
              <h4 className="font-semibold text-foreground text-sm">Allow New Account Registration</h4>
              <p className="text-xs text-muted-foreground">Students can create new accounts directly via the Registration page.</p>
            </div>
            <Switch
              checked={Boolean(formState.allow_registration)}
              onCheckedChange={(checked) => setFormState((s) => ({ ...s, allow_registration: checked }))}
              aria-label="Toggle user registration"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/40 border border-border rounded-xl">
            <div className="space-y-1 pr-4">
              <h4 className="font-semibold text-foreground text-sm">Account Sharing Protection</h4>
              <p className="text-xs text-muted-foreground">Automatically lock accounts upon detecting suspicious credential sharing.</p>
            </div>
            <Switch
              checked={Boolean(formState.anti_sharing_enabled)}
              onCheckedChange={(checked) => setFormState((s) => ({ ...s, anti_sharing_enabled: checked }))}
              aria-label="Toggle account sharing protection"
            />
          </div>

          {formState.anti_sharing_enabled && (
            <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-2 animate-in fade-in duration-200">
              <label htmlFor="max_violations" className="text-xs font-semibold text-foreground">
                Max violation threshold / week (Monday → Sunday, UTC+7)
              </label>
              <Input
                id="max_violations"
                type="number"
                min={3}
                max={50}
                value={formState.anti_sharing_max_violations ?? 5}
                onChange={(e) => setFormState((s) => ({ ...s, anti_sharing_max_violations: Number.parseInt(e.target.value, 10) || 5 }))}
                className="w-32 bg-background border-border text-foreground focus:border-primary"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm px-6 rounded-xl cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Security Settings
        </Button>
      </div>
    </div>
  )
})
