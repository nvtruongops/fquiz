'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Globe, Save, Loader2, Wrench } from 'lucide-react'
import { Settings } from '@/hooks/useAdminSettings'

interface GeneralSettingsCardProps {
  formState: Partial<Settings>
  setFormState: React.Dispatch<React.SetStateAction<Partial<Settings>>>
  onSave: () => void
  isSaving: boolean
}

export const GeneralSettingsCard = React.memo(function GeneralSettingsCard({
  formState,
  setFormState,
  onSave,
  isSaving,
}: GeneralSettingsCardProps) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
      <Card className="border-border bg-card text-card-foreground shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground text-base font-bold flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" /> Project Information
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs">Configure public information displayed across the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="app_name" className="text-xs font-semibold text-foreground uppercase tracking-wider">Application Name</label>
            <Input
              id="app_name"
              value={formState.app_name ?? ''}
              onChange={(e) => setFormState((s) => ({ ...s, app_name: e.target.value }))}
              className="bg-background border-border focus:border-primary text-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="app_description" className="text-xs font-semibold text-foreground uppercase tracking-wider">Short Description (SEO)</label>
            <textarea
              id="app_description"
              rows={3}
              value={formState.app_description ?? ''}
              onChange={(e) => setFormState((s) => ({ ...s, app_description: e.target.value }))}
              className="w-full resize-none border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card text-card-foreground shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground text-base font-bold flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" /> System Status
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs">Manage maintenance mode and access restrictions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/40 border border-border rounded-xl">
            <div className="space-y-1 pr-4">
              <h4 className="font-semibold text-foreground text-sm">System Maintenance Mode</h4>
              <p className="text-xs text-muted-foreground">Disables features and displays an Under Maintenance notice to users.</p>
            </div>
            <Switch
              checked={Boolean(formState.maintenance_mode)}
              onCheckedChange={(checked) => setFormState((s) => ({ ...s, maintenance_mode: checked }))}
              aria-label="Toggle maintenance mode"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm px-6 rounded-xl cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Display Settings
        </Button>
      </div>
    </div>
  )
})
