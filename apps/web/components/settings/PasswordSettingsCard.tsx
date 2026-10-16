'use client'

import React from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { PasswordField } from '@/components/settings/PasswordField'
import type { PasswordForm, PasswordErrors, ShowPasswords } from '@/hooks/useUserSettings'

interface PasswordSettingsCardProps {
  passwordForm: PasswordForm
  passwordErrors: PasswordErrors
  showPasswords: ShowPasswords
  changingPassword: boolean
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>
  onUpdateField: (field: keyof PasswordForm, value: string) => void
  onToggleVisibility: (field: keyof PasswordForm) => void
}

export function PasswordSettingsCard({
  passwordForm,
  passwordErrors,
  showPasswords,
  changingPassword,
  onSubmit,
  onUpdateField,
  onToggleVisibility,
}: PasswordSettingsCardProps) {
  return (
    <Card className="rounded-xl sm:rounded-3xl border-border bg-card text-card-foreground shadow-xs">
      <CardHeader className="p-3.5 sm:p-6 pb-1 sm:pb-3">
        <CardTitle className="text-primary text-base sm:text-xl font-extrabold flex items-center gap-1.5 sm:gap-2">
          <KeyRound className="w-4 h-4 sm:w-5 sm:h-5" />
          Change Password
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3.5 sm:p-6 pt-2 sm:pt-4">
        <form onSubmit={onSubmit} className="space-y-3.5 sm:space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
            <PasswordField
              id="current-password"
              label="Current password"
              field="currentPassword"
              value={passwordForm.currentPassword}
              autoComplete="current-password"
              visible={showPasswords.currentPassword}
              error={passwordErrors.currentPassword}
              disabled={changingPassword}
              onChange={onUpdateField}
              onToggleVisibility={onToggleVisibility}
            />
            <PasswordField
              id="new-password"
              label="New password"
              field="newPassword"
              value={passwordForm.newPassword}
              autoComplete="new-password"
              visible={showPasswords.newPassword}
              error={passwordErrors.newPassword}
              disabled={changingPassword}
              onChange={onUpdateField}
              onToggleVisibility={onToggleVisibility}
            />
            <PasswordField
              id="confirm-password"
              label="Confirm new password"
              field="confirmPassword"
              value={passwordForm.confirmPassword}
              autoComplete="new-password"
              visible={showPasswords.confirmPassword}
              error={passwordErrors.confirmPassword}
              disabled={changingPassword}
              onChange={onUpdateField}
              onToggleVisibility={onToggleVisibility}
            />
          </div>
          <p className="text-[11px] sm:text-xs font-medium text-muted-foreground leading-relaxed">
            New password must be at least 6 characters. The system only stores hashed passwords and will invalidate previous sessions upon change.
          </p>
          <Button
            type="submit"
            disabled={changingPassword}
            className="h-9 sm:h-10 px-4 rounded-lg sm:rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer w-full sm:w-fit justify-center"
          >
            {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Change Password
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
