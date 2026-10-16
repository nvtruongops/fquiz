'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { useStudentProfile } from '@/hooks/student/useStudentProfile'
import { ProfileFormCard } from '@/components/student/profile/ProfileFormCard'
import { DeleteAccountModal } from '@/components/student/profile/DeleteAccountModal'

export default function ProfilePage() {
  const {
    loading,
    saving,
    deleting,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deletePassword,
    setDeletePassword,
    profile,
    form,
    setForm,
    bioLength,
    handleSave,
    handleRequestDeletion,
  } = useStudentProfile()

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-primary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-bold uppercase tracking-wider">Loading profile...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 sm:pb-10 px-3 sm:px-6 md:px-10">
      {/* Banner */}
      <section className="rounded-xl sm:rounded-[28px] bg-primary text-primary-foreground p-4 sm:p-6 md:p-8 shadow-xl">
        <div className="flex items-center sm:items-start gap-3.5 sm:gap-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl bg-primary-foreground/20 border border-primary-foreground/30 flex items-center justify-center shrink-0 shadow-xs">
            <span className="font-extrabold text-xl sm:text-2xl md:text-3xl text-primary-foreground">
              {(profile?.username?.[0] ?? 'U').toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-xs uppercase tracking-[0.2em] text-primary-foreground/70 font-extrabold">
              Profile
            </p>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold mt-0.5 sm:mt-1 truncate text-primary-foreground">
              {profile?.username ?? 'User'}
            </h1>
            <p className="text-xs sm:text-sm text-primary-foreground/80 mt-1 sm:mt-2 max-w-xl font-medium leading-relaxed hidden sm:block">
              Manage your personal information to keep your profile consistent, trustworthy, and easily recognized.
            </p>
          </div>
        </div>
      </section>

      {/* Main Info Cards */}
      <ProfileFormCard
        profile={profile}
        form={form}
        onFormChange={setForm}
        bioLength={bioLength}
        saving={saving}
        onSave={handleSave}
      />

      {/* Danger Zone */}
      <DeleteAccountModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        password={deletePassword}
        onPasswordChange={setDeletePassword}
        deleting={deleting}
        onConfirmDelete={handleRequestDeletion}
      />
    </div>
  )
}
