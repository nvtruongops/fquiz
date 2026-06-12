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

const TIMEZONES = [
  'Asia/Ho_Chi_Minh',
  'Asia/Bangkok',
  'Asia/Singapore',
  'UTC',
]

export default function StudentSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = useState({
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

  const notificationsEnabled = false

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

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Vui lòng nhập đầy đủ thông tin đổi mật khẩu')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Mật khẩu nhập lại không khớp')
      return
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      toast.error('Mật khẩu mới phải khác mật khẩu hiện tại')
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
          const firstError = Object.values(data.details).flat().find(Boolean)
          toast.error(typeof firstError === 'string' ? firstError : 'Đổi mật khẩu thất bại')
          return
        }

        toast.error(data?.error ?? 'Đổi mật khẩu thất bại')
        return
      }

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setShowPasswords({ currentPassword: false, newPassword: false, confirmPassword: false })
      toast.success('Đã đổi mật khẩu thành công. Vui lòng đăng nhập lại ở các phiên khác nếu cần.')
    } catch {
      toast.error('Không thể đổi mật khẩu vào lúc này')
    } finally {
      setChangingPassword(false)
    }
  }

  function PasswordField({
    id,
    label,
    value,
    field,
    autoComplete,
  }: {
    id: string
    label: string
    value: string
    field: keyof typeof passwordForm
    autoComplete: string
  }) {
    const visible = showPasswords[field]

    return (
      <div>
        <label htmlFor={id} className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{label}</label>
        <div className="relative mt-2">
          <input
            id={id}
            type={visible ? 'text' : 'password'}
            value={value}
            autoComplete={autoComplete}
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, [field]: event.target.value }))}
            className="w-full rounded-xl border border-[#5D7B6F]/20 bg-white px-4 py-3 pr-12 text-sm font-semibold text-gray-700 outline-none transition focus:border-[#5D7B6F] focus:ring-4 focus:ring-[#5D7B6F]/10"
          />
          <button
            type="button"
            onClick={() => setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }))}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition hover:bg-[#5D7B6F]/10 hover:text-[#5D7B6F]"
            aria-label={visible ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#5D7B6F]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-bold uppercase tracking-wider">Đang tải cài đặt</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-[28px] bg-gradient-to-br from-[#EAE7D6] to-[#D7F9FA] p-6 md:p-8 border border-[#5D7B6F]/10 shadow-xl shadow-[#5D7B6F]/5">
        <p className="text-xs uppercase tracking-[0.2em] text-[#5D7B6F] font-black">Settings</p>
        <h1 className="text-2xl md:text-3xl font-black text-[#5D7B6F] mt-1">Cài đặt tài khoản</h1>
        <p className="text-sm text-gray-600 mt-2 max-w-2xl">
          Điều chỉnh ngôn ngữ, thông báo và quyền riêng tư để phù hợp với cách học của bạn.
        </p>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-3xl border-[#5D7B6F]/10 shadow-lg shadow-[#5D7B6F]/5">
          <CardHeader>
            <CardTitle className="text-[#5D7B6F] text-xl font-black flex items-center gap-2">
              <Globe2 className="w-5 h-5" />
              Khu vực hiển thị
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label htmlFor="student-language" className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">Ngôn ngữ</label>
              <Select
                value={form.language}
                onValueChange={(value: 'vi' | 'en') => {
                  if (value !== form.language) {
                    toast.info('Tính năng đổi ngôn ngữ đang được phát triển. Coming soon.')
                  }
                }}
              >
                <SelectTrigger id="student-language" className="mt-2 rounded-xl border-[#5D7B6F]/20">
                  <SelectValue placeholder="Chọn ngôn ngữ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vi">Tiếng Việt</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="student-timezone" className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">Múi giờ</label>
              <Select
                value={form.timezone}
                onValueChange={(value) => {
                  if (value !== form.timezone) {
                    toast.info('Tính năng đổi múi giờ đang được phát triển. Coming soon.')
                  }
                }}
              >
                <SelectTrigger id="student-timezone" className="mt-2 rounded-xl border-[#5D7B6F]/20">
                  <SelectValue placeholder="Chọn múi giờ" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-[#5D7B6F]/10 shadow-lg shadow-[#5D7B6F]/5">
          <CardHeader>
            <CardTitle className="text-[#5D7B6F] text-xl font-black flex items-center gap-2">
              <BellRing className="w-5 h-5" />
              Thông báo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-[#5D7B6F]/10 p-4">
              <div>
                <p className="font-black text-gray-700">Bật thông báo</p>
                <p className="text-xs text-gray-500">Bao gồm email hệ thống và nhắc lịch ôn tập</p>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    toast.info('Tính năng Bật thông báo đang được phát triển. Coming soon.')
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-[#5D7B6F]/10 shadow-lg shadow-[#5D7B6F]/5">
        <CardHeader>
          <CardTitle className="text-[#5D7B6F] text-xl font-black flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Đổi mật khẩu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-5">
            <div className="grid md:grid-cols-3 gap-4">
              <PasswordField
                id="current-password"
                label="Mật khẩu hiện tại"
                field="currentPassword"
                value={passwordForm.currentPassword}
                autoComplete="current-password"
              />
              <PasswordField
                id="new-password"
                label="Mật khẩu mới"
                field="newPassword"
                value={passwordForm.newPassword}
                autoComplete="new-password"
              />
              <PasswordField
                id="confirm-password"
                label="Nhập lại mật khẩu mới"
                field="confirmPassword"
                value={passwordForm.confirmPassword}
                autoComplete="new-password"
              />
            </div>
            <p className="text-xs font-medium text-gray-500">
              Mật khẩu mới cần tối thiểu 6 ký tự. Hệ thống chỉ lưu mật khẩu đã hash và sẽ vô hiệu hóa các phiên đăng nhập cũ sau khi đổi.
            </p>
            <Button
              type="submit"
              disabled={changingPassword}
              className="rounded-xl bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-black w-fit"
            >
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Đổi mật khẩu
            </Button>
          </form>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="rounded-xl bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-black w-fit"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Lưu cài đặt
      </Button>
    </div>
  )
}
