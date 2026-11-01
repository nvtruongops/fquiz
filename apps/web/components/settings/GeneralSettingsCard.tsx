'use client'

import React from 'react'
import { Save, Globe2, BellRing, Mail, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Switch } from '@/components/shared/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select'
import { TIMEZONES, type SettingsResponse } from '@/hooks/useUserSettings'
import { cn } from '@/lib/core/utils/cn'
import { LocaleSwitcher, useTranslations } from '@fquiz/ui/i18n'

interface GeneralSettingsCardProps {
  form: SettingsResponse['settings']
  setForm: React.Dispatch<React.SetStateAction<SettingsResponse['settings']>>
  notificationsEnabled: boolean
  saving: boolean
  onSave: () => Promise<void>
  onChangeLanguage: (language: 'vi' | 'en') => void
}

export function GeneralSettingsCard({
  form,
  setForm,
  notificationsEnabled,
  saving,
  onSave,
  onChangeLanguage,
}: GeneralSettingsCardProps) {
  const t = useTranslations()

  return (
    <Card className="rounded-xl sm:rounded-3xl border-border bg-card text-card-foreground shadow-xs">
      <CardHeader className="p-3.5 sm:p-6 pb-1 sm:pb-3">
        <CardTitle className="text-primary text-base sm:text-xl font-extrabold flex items-center gap-1.5 sm:gap-2">
          <Save className="w-4 h-4 sm:w-5 sm:h-5" />
          {t('settings.general')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3.5 sm:p-6 pt-2 sm:pt-4 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-6">
          {/* Section: Display and Regional Settings */}
          <div className="rounded-xl sm:rounded-2xl border border-border bg-muted/30 p-3.5 sm:p-5">
            <div className="text-primary text-sm sm:text-lg font-extrabold flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-5">
              <Globe2 className="w-4 h-4 sm:w-5 sm:h-5" />
              {t('settings.displayRegional')}
            </div>
            <div className="space-y-3.5 sm:space-y-5">
              <div>
                <label
                  htmlFor="student-language"
                  className="text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {t('settings.language')}
                </label>
                <div className="mt-1.5">
                  <LocaleSwitcher id="student-language" fullWidth onLocaleChange={onChangeLanguage} />
                </div>
              </div>

              <div>
                <label
                  htmlFor="student-timezone"
                  className="text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {t('settings.timezone')}
                </label>
                <Select
                  value={form.timezone}
                  onValueChange={(value) => {
                    if (value !== form.timezone) {
                      setForm((previous) => ({ ...previous, timezone: value }))
                    }
                  }}
                >
                  <SelectTrigger
                    id="student-timezone"
                    className="mt-1.5 h-9 sm:h-10 text-xs sm:text-sm rounded-lg sm:rounded-xl border-input bg-card text-foreground"
                  >
                    <SelectValue placeholder={t('settings.selectTimezone')} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section: Notification Settings */}
          <div className="rounded-xl sm:rounded-2xl border border-border bg-muted/30 p-3.5 sm:p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-5">
              <div className="text-primary text-sm sm:text-lg font-extrabold flex items-center gap-1.5 sm:gap-2">
                <BellRing className="w-4 h-4 sm:w-5 sm:h-5" />
                {t('settings.notifications')}
              </div>
              <span
                className={cn(
                  'text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border',
                  form.notifyEmail
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-muted text-muted-foreground border-border'
                )}
              >
                {form.notifyEmail ? t('settings.enabled') : t('settings.disabled')}
              </span>
            </div>

            <div className="space-y-3">
              {/* Toggle: Email for New Quizzes in Pinned Categories */}
              <div className="flex items-start justify-between rounded-lg sm:rounded-xl border border-border bg-card p-3 sm:p-3.5 gap-3 transition-all hover:border-primary/30">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                  <p className="font-extrabold text-xs sm:text-sm text-foreground">{t('settings.pinnedQuizEmails')}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground leading-snug mt-0.5">
                      {t('settings.pinnedQuizEmailsDescription')}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.notifyEmail}
                  onCheckedChange={(checked) => {
                    setForm((prev) => ({
                      ...prev,
                      notifyEmail: checked,
                      notifyQuizReminder: checked,
                    }))
                  }}
                  aria-label={t('settings.enablePinnedQuizEmails')}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-border pt-3 sm:pt-5">
          <Button
            onClick={onSave}
            disabled={saving}
            className="h-9 sm:h-10 px-4 rounded-lg sm:rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer w-full sm:w-fit justify-center"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('settings.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
