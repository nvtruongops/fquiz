'use client'

import React from 'react'
import { UserRound, Save, Loader2, Mail, CalendarClock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Input } from '@/components/shared/ui/input'
import { Button } from '@/components/shared/ui/button'
import type { ProfileData } from '@/hooks/student/useStudentProfile'

interface ProfileFormCardProps {
  profile: ProfileData | null
  form: { username: string; bio: string }
  onFormChange: React.Dispatch<React.SetStateAction<{ username: string; bio: string }>>
  bioLength: number
  saving: boolean
  onSave: () => void
}

export function ProfileFormCard({
  profile,
  form,
  onFormChange,
  bioLength,
  saving,
  onSave,
}: ProfileFormCardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <Card className="lg:col-span-2 border-border bg-card text-card-foreground rounded-xl sm:rounded-3xl shadow-xs">
        <CardHeader className="p-3.5 sm:p-6 pb-1 sm:pb-3">
          <CardTitle className="text-base sm:text-xl font-extrabold text-primary">
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-6 pt-2 sm:pt-4 space-y-3.5 sm:space-y-5">
          <div>
            <label
              htmlFor="profile-username"
              className="text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.18em] text-muted-foreground"
            >
              Display Name
            </label>
            <div className="relative mt-1.5">
              <UserRound className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                id="profile-username"
                value={form.username}
                readOnly
                disabled
                className="pl-9 sm:pl-10 h-9 sm:h-10 text-xs sm:text-sm rounded-lg sm:rounded-xl border-border bg-muted text-muted-foreground cursor-not-allowed font-medium"
              />
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1 font-medium">
              Username is permanently assigned during registration for data consistency.
            </p>
          </div>

          <div>
            <label
              htmlFor="profile-bio"
              className="text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.18em] text-muted-foreground"
            >
              Short Bio
            </label>
            <textarea
              id="profile-bio"
              value={form.bio}
              onChange={(e) => onFormChange((prev) => ({ ...prev, bio: e.target.value }))}
              maxLength={300}
              rows={4}
              className="mt-1.5 w-full rounded-xl sm:rounded-2xl border border-border bg-card text-foreground p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none font-medium placeholder:text-muted-foreground"
              placeholder="Share a short bio or learning goals..."
            />
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1 text-right font-bold">
              {bioLength}/300
            </p>
          </div>

          <Button
            onClick={onSave}
            disabled={saving}
            className="h-9 sm:h-10 px-4 rounded-lg sm:rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Profile
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border rounded-xl sm:rounded-3xl bg-card shadow-xs">
        <CardHeader className="p-3.5 sm:p-6 pb-1 sm:pb-3">
          <CardTitle className="text-sm sm:text-base font-extrabold text-primary">
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-6 pt-2 sm:pt-4 space-y-2.5 sm:space-y-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 sm:gap-3 rounded-lg sm:rounded-xl bg-muted/80 p-2.5 sm:p-3 border border-border">
            <Mail className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground font-extrabold">
                Email
              </p>
              <p className="font-bold text-foreground break-all">{profile?.email ?? '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 rounded-lg sm:rounded-xl bg-muted/80 p-2.5 sm:p-3 border border-border">
            <CalendarClock className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground font-extrabold">
                Member Since
              </p>
              <p className="font-bold text-foreground">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US') : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
