'use client'

import { useEffect, useState } from 'react'
import { BellRing, Eye, EyeOff, Globe2, KeyRound, Loader2, Save } from 'lucide-react'
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
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

type SettingsResponse = {
  settings: {
    timezone: string
    language: 'vi' | 'en'
    notifyEmail: boolean
    notifyQuizReminder: boolean
    privacyShareActivity: boolean
  }
}

type PasswordForm = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type PasswordErrors = Partial<Record<keyof PasswordForm, string>>

type ShowPasswords = Record<keyof PasswordForm, boolean>

const TIMEZONES = [
  'Asia/Ho_Chi_Minh',
  'Asia/Bangkok',
  'Asia/Singapore',
  'UTC',
]

function PasswordField({
  id,
  label,
  value,
  field,
  autoComplete,
  visible,
  error,
  disabled,
  onChange,
  onToggleVisibility,
}: {
  id: string
  label: string
  value: string
  field: keyof PasswordForm
  autoComplete: string
  visible: boolean
  error?: string
  disabled?: boolean
  onChange: (field: keyof PasswordForm, value: string) => void
  onToggleVisibility: (field: keyof PasswordForm) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.18em] text-muted-foreground">{label}</label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(field, event.target.value)}
          className={`w-full h-9 sm:h-10 rounded-lg sm:rounded-xl border bg-muted px-3 sm:px-4 py-2 pr-10 text-xs sm:text-sm font-semibold text-foreground outline-none transition disabled:cursor-not-allowed disabled:opacity-50 ${
            error
              ? 'border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20'
              : 'border-input focus:border-ring focus:ring-2 focus:ring-ring/20'
          }`}
        />
        <button
          type="button"
          onClick={() => onToggleVisibility(field)}
          disabled={disabled}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={visible ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
        </button>
      </div>
      {error && <p id={`${id}-error`} className="mt-1 text-[11px] font-semibold text-destructive">{error}</p>}
    </div>
  )
}

export default function StudentSettingsPage() {
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
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/settings`, { credentials: 'include' })
        if (!res.ok) {
          if (res.status === 404 || res.status === 501) {
            toast.info('Trang cài đặt đang được phát triển. Coming soon.')
            return
          }
          toast.error('Không tải được cài đặt')
          return
        }

        const data = (await res.json()) as SettingsResponse
        setForm(data.settings)
      } catch {
        toast.error('Hệ thống đang bận, vui lòng thử lại')
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
          toast.info('Tính năng lưu cài đặt đang được phát triển. Coming soon.')
          return
        }
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error ?? 'Lưu cài đặt thất bại')
        return
      }

      const data = (await res.json()) as SettingsResponse
      setForm(data.settings)
      toast.success('Đã lưu cài đặt thành công')
    } catch {
      toast.error('Không thể lưu cài đặt vào lúc này')
    } finally {
      setSaving(false)
    }
  }

  function validatePasswordForm() {
    const errors: PasswordErrors = {}

    if (!passwordForm.currentPassword.trim()) {
      errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại'
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'Vui lòng nhập mật khẩu mới'
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự'
    } else if (passwordForm.newPassword.length > 50) {
      errors.newPassword = 'Mật khẩu mới quá dài'
    } else if (passwordForm.currentPassword && passwordForm.currentPassword === passwordForm.newPassword) {
      errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại'
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Vui lòng nhập lại mật khẩu mới'
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Mật khẩu nhập lại không khớp'
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
          toast.error(typeof firstError === 'string' ? firstError : 'Đổi mật khẩu thất bại')
          return
        }

        if (res.status === 401) {
          setPasswordErrors({ currentPassword: data?.error ?? 'Mật khẩu hiện tại không đúng' })
        }
        toast.error(data?.error ?? 'Đổi mật khẩu thất bại')
        return
      }

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordErrors({})
      setShowPasswords({ currentPassword: false, newPassword: false, confirmPassword: false })
      toast.success('Đã đổi mật khẩu thành công. Vui lòng đăng nhập lại ở các phiên khác nếu cần.')
    } catch {
      toast.error('Không thể đổi mật khẩu vào lúc này')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-primary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-bold uppercase tracking-wider">Đang tải cài đặt</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 sm:pb-10 px-3 sm:px-6 md:px-10">
      <section className="rounded-xl sm:rounded-[28px] bg-primary text-primary-foreground p-4 sm:p-6 md:p-8 shadow-xl">
        <p className="text-[9px] sm:text-xs uppercase tracking-[0.2em] text-primary-foreground/70 font-extrabold">Settings</p>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-primary-foreground mt-0.5 sm:mt-1">Cài đặt tài khoản</h1>
        <p className="text-xs sm:text-sm text-primary-foreground/80 mt-1 sm:mt-2 max-w-2xl font-medium leading-relaxed">
          Điều chỉnh ngôn ngữ, thông báo và quyền riêng tư để phù hợp với cách học của bạn.
        </p>
      </section>

      <Card className="rounded-xl sm:rounded-3xl border-border bg-card text-card-foreground shadow-xs">
        <CardHeader className="p-3.5 sm:p-6 pb-1 sm:pb-3">
          <CardTitle className="text-primary text-base sm:text-xl font-extrabold flex items-center gap-1.5 sm:gap-2">
            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
            Cài đặt chung
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-6 pt-2 sm:pt-4 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-6">
            <div className="rounded-xl sm:rounded-2xl border border-border bg-muted/30 p-3.5 sm:p-5">
              <div className="text-primary text-sm sm:text-lg font-extrabold flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-5">
                <Globe2 className="w-4 h-4 sm:w-5 sm:h-5" />
                Khu vực hiển thị
              </div>
              <div className="space-y-3.5 sm:space-y-5">
                <div>
                  <label htmlFor="student-language" className="text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Ngôn ngữ</label>
                  <Select
                    value={form.language}
                    onValueChange={(value: 'vi' | 'en') => {
                      if (value !== form.language) {
                        toast.info('Tính năng đổi ngôn ngữ đang được phát triển. Coming soon.')
                      }
                    }}
                  >
                    <SelectTrigger id="student-language" className="mt-1.5 h-9 sm:h-10 text-xs sm:text-sm rounded-lg sm:rounded-xl border-input bg-card text-foreground">
                      <SelectValue placeholder="Chọn ngôn ngữ" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      <SelectItem value="vi">Tiếng Việt</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label htmlFor="student-timezone" className="text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Múi giờ</label>
                  <Select
                    value={form.timezone}
                    onValueChange={(value) => {
                      if (value !== form.timezone) {
                        toast.info('Tính năng đổi múi giờ đang được phát triển. Coming soon.')
                      }
                    }}
                  >
                    <SelectTrigger id="student-timezone" className="mt-1.5 h-9 sm:h-10 text-xs sm:text-sm rounded-lg sm:rounded-xl border-input bg-card text-foreground">
                      <SelectValue placeholder="Chọn múi giờ" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-xl sm:rounded-2xl border border-border bg-muted/30 p-3.5 sm:p-5">
              <div className="text-primary text-sm sm:text-lg font-extrabold flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-5">
                <BellRing className="w-4 h-4 sm:w-5 sm:h-5" />
                Thông báo
              </div>
              <div className="flex items-center justify-between rounded-lg sm:rounded-xl border border-border bg-card p-3 sm:p-4 gap-3">
                <div className="min-w-0">
                  <p className="font-extrabold text-xs sm:text-sm text-foreground">Bật thông báo</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground leading-snug">Bao gồm email hệ thống và nhắc lịch ôn tập</p>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={(checked) => {
                    setForm((prev) => ({
                      ...prev,
                      notifyEmail: checked,
                      notifyQuizReminder: checked,
                    }))
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-border pt-3 sm:pt-5">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-9 sm:h-10 px-4 rounded-lg sm:rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer w-full sm:w-fit justify-center"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Lưu cài đặt
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl sm:rounded-3xl border-border bg-card text-card-foreground shadow-xs">
        <CardHeader className="p-3.5 sm:p-6 pb-1 sm:pb-3">
          <CardTitle className="text-primary text-base sm:text-xl font-extrabold flex items-center gap-1.5 sm:gap-2">
            <KeyRound className="w-4 h-4 sm:w-5 sm:h-5" />
            Đổi mật khẩu
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-6 pt-2 sm:pt-4">
          <form onSubmit={handleChangePassword} className="space-y-3.5 sm:space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
              <PasswordField
                id="current-password"
                label="Mật khẩu hiện tại"
                field="currentPassword"
                value={passwordForm.currentPassword}
                autoComplete="current-password"
                visible={showPasswords.currentPassword}
                error={passwordErrors.currentPassword}
                disabled={changingPassword}
                onChange={updatePasswordField}
                onToggleVisibility={togglePasswordVisibility}
              />
              <PasswordField
                id="new-password"
                label="Mật khẩu mới"
                field="newPassword"
                value={passwordForm.newPassword}
                autoComplete="new-password"
                visible={showPasswords.newPassword}
                error={passwordErrors.newPassword}
                disabled={changingPassword}
                onChange={updatePasswordField}
                onToggleVisibility={togglePasswordVisibility}
              />
              <PasswordField
                id="confirm-password"
                label="Nhập lại mật khẩu mới"
                field="confirmPassword"
                value={passwordForm.confirmPassword}
                autoComplete="new-password"
                visible={showPasswords.confirmPassword}
                error={passwordErrors.confirmPassword}
                disabled={changingPassword}
                onChange={updatePasswordField}
                onToggleVisibility={togglePasswordVisibility}
              />
            </div>
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground leading-relaxed">
              Mật khẩu mới cần tối thiểu 6 ký tự. Hệ thống chỉ lưu mật khẩu đã hash và sẽ vô hiệu hóa các phiên đăng nhập cũ sau khi đổi.
            </p>
            <Button
              type="submit"
              disabled={changingPassword}
              className="h-9 sm:h-10 px-4 rounded-lg sm:rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer w-full sm:w-fit justify-center"
            >
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Đổi mật khẩu
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
