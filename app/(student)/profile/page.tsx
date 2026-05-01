'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Mail, CalendarClock, Save, UserRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/store/toast-store'
import { withCsrfHeaders } from '@/lib/csrf'

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
    <div className="space-y-6 pb-10">
      <section className="rounded-[28px] bg-gradient-to-br from-[#5D7B6F] to-[#4A6359] text-white p-6 md:p-8 shadow-2xl shadow-[#5D7B6F]/20">
        <div className="flex items-start gap-4 md:gap-6">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center">
            <span className="font-black text-2xl md:text-3xl">{(profile?.username?.[0] ?? 'U').toUpperCase()}</span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/70 font-bold">Trang cá nhân</p>
            <h1 className="text-2xl md:text-3xl font-black mt-1">{profile?.username ?? 'Người dùng'}</h1>
            <p className="text-sm text-white/80 mt-2 max-w-xl">
              Quản lý thông tin cá nhân để hồ sơ của bạn nhất quán, tin cậy và dễ nhận diện trong hệ thống.
            </p>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-[#5D7B6F]/10 rounded-3xl shadow-lg shadow-[#5D7B6F]/5">
          <CardHeader>
            <CardTitle className="text-xl font-black text-[#5D7B6F]">Thông tin cá nhân</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label htmlFor="profile-username" className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">Tên hiển thị</label>
              <div className="relative mt-2">
                <UserRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="profile-username"
                  value={form.username}
                  readOnly
                  disabled
                  className="pl-10 rounded-xl border-[#5D7B6F]/20 bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1 font-bold">Username được cố định theo lúc đăng ký để đảm bảo nhất quán dữ liệu.</p>
            </div>

            <div>
              <label htmlFor="profile-bio" className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">Giới thiệu ngắn</label>
              <textarea
                id="profile-bio"
                value={form.bio}
                onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                maxLength={300}
                rows={5}
                className="mt-2 w-full rounded-2xl border border-[#5D7B6F]/20 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D7B6F]"
                placeholder="Chia sẻ ngắn về mục tiêu học tập của bạn..."
              />
              <p className="text-[11px] text-gray-400 mt-1 text-right font-bold">{bioLength}/300</p>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-black"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Lưu hồ sơ
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[#A4C3A2]/30 rounded-3xl bg-[#EAE7D6]/40 shadow-lg shadow-[#5D7B6F]/5">
          <CardHeader>
            <CardTitle className="text-base font-black text-[#5D7B6F]">Thông tin tài khoản</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-3 rounded-xl bg-white p-3 border border-[#5D7B6F]/10">
              <Mail className="w-4 h-4 text-[#5D7B6F]" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Email</p>
                <p className="font-bold text-gray-700 break-all">{profile?.email ?? '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-white p-3 border border-[#5D7B6F]/10">
              <CalendarClock className="w-4 h-4 text-[#5D7B6F]" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Ngày tham gia</p>
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
