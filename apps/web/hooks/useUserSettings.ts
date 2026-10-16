import { useState, useEffect } from 'react'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

export type SettingsResponse = {
  settings: {
    timezone: string
    language: 'vi' | 'en'
    notifyEmail: boolean
    notifyQuizReminder: boolean
    privacyShareActivity: boolean
  }
}

export type PasswordForm = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export type PasswordErrors = Partial<Record<keyof PasswordForm, string>>
export type ShowPasswords = Record<keyof PasswordForm, boolean>

export const TIMEZONES = [
  'Asia/Ho_Chi_Minh',
  'Asia/Bangkok',
  'Asia/Singapore',
  'UTC',
]

export function useUserSettings() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({})
  const [showPasswords, setShowPasswords] = useState<ShowPasswords>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })
  const [form, setForm] = useState<SettingsResponse['settings']>({
    timezone: 'Asia/Ho_Chi_Minh',
    language: 'vi',
    notifyEmail: true,
    notifyQuizReminder: true,
    privacyShareActivity: false,
  })

  const notificationsEnabled = Boolean(form.notifyEmail && form.notifyQuizReminder)

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/settings`, {
          credentials: 'include',
        })
        if (!res.ok) {
          if (res.status === 404 || res.status === 501) {
            toast.info('Settings page is under development. Coming soon.')
            return
          }
          toast.error('Failed to load settings')
          return
        }

        const data = (await res.json()) as SettingsResponse
        setForm(data.settings)
      } catch {
        toast.error('System is busy, please try again')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [toast])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/settings`, {
        method: 'PATCH',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          timezone: form.timezone,
          language: form.language,
          notify_email: form.notifyEmail,
          notify_quiz_reminder: form.notifyQuizReminder,
          privacy_share_activity: false,
        }),
      })

      if (!res.ok) {
        if (res.status === 404 || res.status === 501) {
          toast.info('Save settings feature is under development. Coming soon.')
          return
        }
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error ?? 'Failed to save settings')
        return
      }

      const data = (await res.json()) as SettingsResponse
      setForm(data.settings)
      toast.success('Settings saved successfully')
    } catch {
      toast.error('Unable to save settings at this time')
    } finally {
      setSaving(false)
    }
  }

  function validatePasswordForm() {
    const errors: PasswordErrors = {}

    if (!passwordForm.currentPassword.trim()) {
      errors.currentPassword = 'Please enter your current password'
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'Please enter a new password'
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = 'New password must be at least 6 characters long'
    } else if (passwordForm.newPassword.length > 50) {
      errors.newPassword = 'New password is too long'
    } else if (passwordForm.currentPassword && passwordForm.currentPassword === passwordForm.newPassword) {
      errors.newPassword = 'New password must be different from current password'
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password'
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Confirmation password does not match'
    }

    setPasswordErrors(errors)
    return Object.keys(errors).length === 0
  }

  function updatePasswordField(field: keyof PasswordForm, value: string) {
    setPasswordForm((prev) => ({ ...prev, [field]: value }))
    setPasswordErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function togglePasswordVisibility(field: keyof PasswordForm) {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!validatePasswordForm()) {
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/settings/password`, {
        method: 'PATCH',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(passwordForm),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.details) {
          setPasswordErrors(data.details as PasswordErrors)
          const firstError = Object.values(data.details).flat().find(Boolean)
          toast.error(typeof firstError === 'string' ? firstError : 'Failed to change password')
          return
        }

        if (res.status === 401) {
          setPasswordErrors({ currentPassword: data?.error ?? 'Current password is incorrect' })
        }
        toast.error(data?.error ?? 'Failed to change password')
        return
      }

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordErrors({})
      setShowPasswords({ currentPassword: false, newPassword: false, confirmPassword: false })
      toast.success('Password changed successfully. Please re-login on other devices if needed.')
    } catch {
      toast.error('Unable to change password at this time')
    } finally {
      setChangingPassword(false)
    }
  }

  return {
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
  }
}
