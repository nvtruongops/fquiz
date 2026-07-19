'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Mail, CalendarClock, Save, UserRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Input } from '@/components/shared/ui/input'
import { Button } from '@/components/shared/ui/button'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

type ProfileResponse = {
  profile: {
    username: string
    email: string
    avatarUrl: string
    bio: string
    createdAt: string
  }
}

export default function ProfilePage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<ProfileResponse['profile'] | null>(null)
  const [form, setForm] = useState({ username: '', bio: '' })

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/profile`, { credentials: 'include' })
        if (!res.ok) {
          if (res.status === 404 || res.status === 501) {
            toast.info('Trang hồ sơ đang được phát triển. Coming soon.')
            return
          }
          toast.error('Không tải được hồ sơ người dùng')
          return
        }

        const data = (await res.json()) as ProfileResponse
        setProfile(data.profile)
        setForm({
          username: data.profile.username,
          bio: data.profile.bio,
        })
      } catch {
        toast.error('Hệ thống đang bận, vui lòng thử lại')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [toast])

  const bioLength = useMemo(() => form.bio.length, [form.bio])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/profile`, {
        method: 'PATCH',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          profile_bio: form.bio,
        }),
      })

      if (!res.ok) {
        if (res.status === 404 || res.status === 501) {
          toast.info('Tính năng cập nhật hồ sơ đang được phát triển. Coming soon.')
          return
        }
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error ?? 'Cập nhật hồ sơ thất bại')
        return
      }

      const data = (await res.json()) as ProfileResponse
      setForm({
        username: data.profile.username,
        bio: data.profile.bio,
      })
      setProfile((prev) => ({
        username: data.profile.username,
        email: data.profile.email,
        avatarUrl: prev?.avatarUrl || '',
        bio: data.profile.bio,
        createdAt: data.profile.createdAt,
      }))
      toast.success('Đã cập nhật hồ sơ thành công')
    } catch {
      toast.error('Không thể cập nhật hồ sơ vào lúc này')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#5D7B6F]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-bold uppercase tracking-wider">Đang tải hồ sơ</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 sm:pb-10 px-3 sm:px-6 md:px-10">
      <section className="rounded-xl sm:rounded-[28px] bg-gradient-to-br from-[#5D7B6F] to-[#4A6359] text-white p-4 sm:p-6 md:p-8 shadow-xl shadow-[#5D7B6F]/15">
        <div className="flex items-center sm:items-start gap-3.5 sm:gap-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-xs">
            <span className="font-extrabold text-xl sm:text-2xl md:text-3xl">{(profile?.username?.[0] ?? 'U').toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-xs uppercase tracking-[0.2em] text-white/70 font-extrabold">Trang cá nhân</p>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold mt-0.5 sm:mt-1 truncate">{profile?.username ?? 'Người dùng'}</h1>
            <p className="text-xs sm:text-sm text-white/80 mt-1 sm:mt-2 max-w-xl font-medium leading-relaxed hidden sm:block">
              Quản lý thông tin cá nhân để hồ sơ của bạn nhất quán, tin cậy và dễ nhận diện trong hệ thống.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2 border-[#5D7B6F]/10 rounded-xl sm:rounded-3xl shadow-xs">
          <CardHeader className="p-3.5 sm:p-6 pb-1 sm:pb-3">
            <CardTitle className="text-base sm:text-xl font-extrabold text-[#5D7B6F]">Thông tin cá nhân</CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-6 pt-2 sm:pt-4 space-y-3.5 sm:space-y-5">
            <div>
              <label htmlFor="profile-username" className="text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.18em] text-gray-500">Tên hiển thị</label>
              <div className="relative mt-1.5">
                <UserRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="profile-username"
                  value={form.username}
                  readOnly
                  disabled
                  className="pl-9 sm:pl-10 h-9 sm:h-10 text-xs sm:text-sm rounded-lg sm:rounded-xl border-[#5D7B6F]/20 bg-gray-50 text-gray-600 cursor-not-allowed font-medium"
                />
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-400 mt-1 font-medium">Username được cố định theo lúc đăng ký để đảm bảo nhất quán dữ liệu.</p>
            </div>

            <div>
              <label htmlFor="profile-bio" className="text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.18em] text-gray-500">Giới thiệu ngắn</label>
              <textarea
                id="profile-bio"
                value={form.bio}
                onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                maxLength={300}
                rows={4}
                className="mt-1.5 w-full rounded-xl sm:rounded-2xl border border-[#5D7B6F]/20 bg-white p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#5D7B6F] resize-none font-medium"
                placeholder="Chia sẻ ngắn về mục tiêu học tập của bạn..."
              />
              <p className="text-[10px] sm:text-[11px] text-gray-400 mt-1 text-right font-bold">{bioLength}/300</p>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-9 sm:h-10 px-4 rounded-lg sm:rounded-xl bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Lưu hồ sơ
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[#A4C3A2]/30 rounded-xl sm:rounded-3xl bg-[#EAE7D6]/40 shadow-xs">
          <CardHeader className="p-3.5 sm:p-6 pb-1 sm:pb-3">
            <CardTitle className="text-sm sm:text-base font-extrabold text-[#5D7B6F]">Thông tin tài khoản</CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-6 pt-2 sm:pt-4 space-y-2.5 sm:space-y-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5 sm:gap-3 rounded-lg sm:rounded-xl bg-white p-2.5 sm:p-3 border border-[#5D7B6F]/10">
              <Mail className="w-4 h-4 text-[#5D7B6F] shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-gray-400 font-extrabold">Email</p>
                <p className="font-bold text-gray-700 break-all">{profile?.email ?? '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 rounded-lg sm:rounded-xl bg-white p-2.5 sm:p-3 border border-[#5D7B6F]/10">
              <CalendarClock className="w-4 h-4 text-[#5D7B6F] shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-gray-400 font-extrabold">Ngày tham gia</p>
                <p className="font-bold text-gray-700">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi-VN') : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
