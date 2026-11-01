import { useState, useEffect, useRef } from 'react'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useLocale, useTranslations } from '@fquiz/ui/i18n'

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
  const { setLocale } = useLocale()
  const t = useTranslations()
  const tRef = useRef(t)
  tRef.current = t
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
            toast.info(tRef.current('settings.loadUnavailable'))
            return
          }
          toast.error(tRef.current('settings.loadFailed'))
          return
        }

        const data = (await res.json()) as SettingsResponse
        setForm(data.settings)
        setLocale(data.settings.language)
      } catch {
        toast.error(tRef.current('settings.systemBusy'))
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [setLocale, toast])

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
          toast.info(t('settings.saveUnavailable'))
          return
        }
        const data = await res.json().catch(() => ({}))
        toast.error(t('settings.saveFailed'))
        return
      }

      const data = (await res.json()) as SettingsResponse
      setForm(data.settings)
      setLocale(data.settings.language)
      toast.success(t('settings.saved'))
    } catch {
      toast.error(t('settings.saveUnavailable'))
    } finally {
      setSaving(false)
    }
  }

  function validatePasswordForm() {
    const errors: PasswordErrors = {}

    if (!passwordForm.currentPassword.trim()) {
      errors.currentPassword = t('settings.enterCurrentPassword')
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = t('settings.enterNewPassword')
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = t('settings.passwordTooShort')
    } else if (passwordForm.newPassword.length > 50) {
      errors.newPassword = t('settings.passwordTooLong')
    } else if (passwordForm.currentPassword && passwordForm.currentPassword === passwordForm.newPassword) {
      errors.newPassword = t('settings.passwordMustDiffer')
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = t('settings.confirmPassword')
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = t('settings.passwordMismatch')
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

  function changeLanguage(language: SettingsResponse['settings']['language']) {
    setForm((prev) => ({ ...prev, language }))
    setLocale(language)
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
          toast.error(typeof firstError === 'string' ? firstError : t('settings.changePasswordFailed'))
          return
        }

        if (res.status === 401) {
          setPasswordErrors({ currentPassword: t('settings.currentPasswordIncorrect') })
        }
        toast.error(t('settings.changePasswordFailed'))
        return
      }

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordErrors({})
      setShowPasswords({ currentPassword: false, newPassword: false, confirmPassword: false })
      toast.success(t('settings.passwordChanged'))
    } catch {
      toast.error(t('settings.changePasswordUnavailable'))
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
    changeLanguage,
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
