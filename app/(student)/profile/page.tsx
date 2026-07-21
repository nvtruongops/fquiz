'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, CalendarClock, Save, UserRound, Trash2, AlertTriangle, KeyRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Input } from '@/components/shared/ui/input'
import { Button } from '@/components/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shared/ui/dialog'
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
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
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

  async function handleRequestDeletion() {
    if (!deletePassword) {
      toast.error('Vui lòng nhập mật khẩu xác nhận')
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/account/request-deletion`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ password: deletePassword }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(data?.error ?? 'Xóa tài khoản thất bại')
        return
      }

      toast.success(data?.message ?? 'Đã gửi yêu cầu xóa tài khoản thành công! Vui lòng kiểm tra email.')
      setDeleteDialogOpen(false)
      setDeletePassword('')

      // Redirect to login page and perform a hard navigation to clear all client memory state
      setTimeout(() => {
        window.location.href = '/login?message=deletion_requested'
      }, 1200)
    } catch {
      toast.error('Không thể kết nối đến máy chủ')
    } finally {
      setDeleting(false)
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

      {/* Danger Zone: Account Deletion */}
      <Card className="border-red-200 bg-red-50/30 rounded-xl sm:rounded-3xl shadow-xs">
        <CardHeader className="p-3.5 sm:p-6 pb-1 sm:pb-3">
          <CardTitle className="text-sm sm:text-base font-extrabold text-red-600 flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Khu vực nguy hiểm
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-6 pt-2 sm:pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-gray-900">Xóa tài khoản cá nhân</h4>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-1 max-w-xl font-medium leading-relaxed">
              Tài khoản sẽ được chuyển sang trạng thái chờ xóa và giữ trong <strong>72 giờ</strong>. Hệ thống sẽ gửi email chứa liên kết khôi phục giúp bạn hoàn tác bất kỳ lúc nào trong 72h.
            </p>
          </div>
          <Button
            onClick={() => setDeleteDialogOpen(true)}
            variant="destructive"
            className="h-9 sm:h-10 px-4 rounded-lg sm:rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shrink-0 shadow-xs cursor-pointer"
          >
            <Trash2 className="w-4 h-4 mr-1.5" /> Xóa tài khoản
          </Button>
        </CardContent>
      </Card>

      {/* Password Confirmation Modal for Account Deletion */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Xác nhận xóa tài khoản
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600 font-medium leading-relaxed mt-2">
              Tài khoản của bạn sẽ tạm dừng hoạt động và lên lịch xóa hoàn toàn sau <strong>72 giờ</strong>.<br />
              Vui lòng nhập mật khẩu hiện tại của bạn để tiếp tục.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2">
            <label htmlFor="confirm-delete-password" className="text-xs font-extrabold uppercase tracking-wider text-gray-600">
              Mật khẩu xác nhận:
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                id="confirm-delete-password"
                type="password"
                placeholder="Nhập mật khẩu tài khoản..."
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && deletePassword && !deleting) {
                    handleRequestDeletion()
                  }
                }}
                className="pl-9 h-10 text-xs sm:text-sm rounded-xl border-gray-300 font-medium"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
              className="rounded-xl h-9 text-xs font-bold"
            >
              Hủy
            </Button>
            <Button
              onClick={handleRequestDeletion}
              disabled={deleting || !deletePassword}
              variant="destructive"
              className="rounded-xl h-9 text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
              Xác nhận xóa tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
