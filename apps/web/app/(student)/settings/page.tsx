'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { GeneralSettingsCard } from '@/components/settings/GeneralSettingsCard'
import { PasswordSettingsCard } from '@/components/settings/PasswordSettingsCard'
import { useUserSettings } from '@/hooks/useUserSettings'

export default function StudentSettingsPage() {
  const {
    loading,
    saving,
    changingPassword,
    form,
    setForm,
    notificationsEnabled,
    passwordForm,
    passwordErrors,
    showPasswords,
    handleSave,
    handleChangePassword,
    updatePasswordField,
    togglePasswordVisibility,
  } = useUserSettings()

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-primary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-bold uppercase tracking-wider">Loading settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 sm:pb-10 px-3 sm:px-6 md:px-10">
      {/* Header Banner */}
      <section className="rounded-xl sm:rounded-[28px] bg-primary text-primary-foreground p-4 sm:p-6 md:p-8 shadow-xl">
        <p className="text-[9px] sm:text-xs uppercase tracking-[0.2em] text-primary-foreground/70 font-extrabold">
          Settings
        </p>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-primary-foreground mt-0.5 sm:mt-1">
          Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-primary-foreground/80 mt-1 sm:mt-2 max-w-2xl font-medium leading-relaxed">
          Adjust language, notifications, and privacy preferences to suit your learning workflow.
        </p>
      </section>

      {/* General Settings */}
      <GeneralSettingsCard
        form={form}
        setForm={setForm}
        notificationsEnabled={notificationsEnabled}
        saving={saving}
        onSave={handleSave}
      />

      {/* Password Change */}
      <PasswordSettingsCard
        passwordForm={passwordForm}
        passwordErrors={passwordErrors}
        showPasswords={showPasswords}
        changingPassword={changingPassword}
        onSubmit={handleChangePassword}
        onUpdateField={updatePasswordField}
        onToggleVisibility={togglePasswordVisibility}
      />
    </div>
  )
}
