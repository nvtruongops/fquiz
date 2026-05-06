'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SlidersHorizontal, ShieldAlert, KeyRound, Globe, Save, Loader2 } from 'lucide-react'
import { useToast } from '@/lib/store/toast-store'
import { withCsrfHeaders } from '@/lib/csrf'

interface Settings {
  _id: string
  app_name: string
  app_description: string
  allow_registration: boolean
  maintenance_mode: boolean
  anti_sharing_enabled: boolean
  anti_sharing_max_violations: number
}

async function fetchSettings(): Promise<{ settings: Settings }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/settings`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch settings')
  return res.json()
}

async function saveSettings(updates: Partial<Settings>): Promise<{ settings: Settings }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/admin/settings`, {
    method: 'PUT',
    credentials: 'include',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? 'Save failed')
  }
  return res.json()
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'general' | 'security'>('general')
  const [formState, setFormState] = useState<Partial<Settings>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: fetchSettings,
  })

  useEffect(() => {
    if (data?.settings) {
      setFormState(data.settings)
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
      toast.success('Đã lưu cấu hình thành công!')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleSave = () => {
    const updates: Partial<Settings> = {}
    if (data?.settings) {
      const s = data.settings
      if (formState.app_name !== s.app_name) updates.app_name = formState.app_name
      if (formState.app_description !== s.app_description) updates.app_description = formState.app_description
      if (formState.allow_registration !== s.allow_registration) updates.allow_registration = formState.allow_registration
      if (formState.maintenance_mode !== s.maintenance_mode) updates.maintenance_mode = formState.maintenance_mode
      if (formState.anti_sharing_enabled !== s.anti_sharing_enabled) updates.anti_sharing_enabled = formState.anti_sharing_enabled
      if (formState.anti_sharing_max_violations !== s.anti_sharing_max_violations) updates.anti_sharing_max_violations = formState.anti_sharing_max_violations
    }
    if (Object.keys(updates).length === 0) {
      toast.info('Không có thay đổi để lưu.')
      return
    }
    saveMutation.mutate(updates)
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#5D7B6F] animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 pb-24">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#5D7B6F]">Cấu hình Hệ thống</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý tham số toàn cục và bảo mật dự án</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Vertical Tabs Sidebar */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-sm text-left
                ${activeTab === 'general'
                  ? 'bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20'
                  : 'text-gray-600 hover:bg-[#EAE7D6] hover:text-[#5D7B6F]'}`}
            >
              <SlidersHorizontal className="w-4 h-4" /> Hiển thị chung
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-sm text-left
                ${activeTab === 'security'
                  ? 'bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20'
                  : 'text-gray-600 hover:bg-[#EAE7D6] hover:text-[#5D7B6F]'}`}
            >
              <ShieldAlert className="w-4 h-4" /> Bảo mật &amp; Thi cử
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 w-full space-y-6">

            {activeTab === 'general' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <Card className="border-[#A4C3A2] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-[#5D7B6F] text-lg flex items-center gap-2">
                      <Globe className="w-5 h-5" /> Thông tin Dự án
                    </CardTitle>
                    <CardDescription>Cấu hình các thông tin công khai hiển thị trên trang chủ</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <label htmlFor="app_name" className="text-sm font-semibold text-gray-700 ml-1">Tên ứng dụng</label>
                      <Input
                        id="app_name"
                        value={formState.app_name ?? ''}
                        onChange={(e) => setFormState((s) => ({ ...s, app_name: e.target.value }))}
                        className="border-gray-200 focus:border-[#5D7B6F] focus:ring-[#5D7B6F]/20 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="app_description" className="text-sm font-semibold text-gray-700 ml-1">Mô tả ngắn (SEO)</label>
                      <textarea
                        id="app_description"
                        rows={3}
                        value={formState.app_description ?? ''}
                        onChange={(e) => setFormState((s) => ({ ...s, app_description: e.target.value }))}
                        className="w-full resize-none border-2 px-4 py-3 text-[15px] outline-none transition-all duration-200 border-gray-200 focus:border-[#5D7B6F] rounded-xl"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#A4C3A2] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-[#5D7B6F] text-lg flex items-center gap-2">Giao diện (Maintenance)</CardTitle>
                    <CardDescription>Quản lý trạng thái bảo trì của hệ thống</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-xl">
                      <div>
                        <h4 className="font-bold text-orange-800">Chế độ bảo trì hệ thống</h4>
                        <p className="text-sm text-orange-600 mt-1">Đóng toàn bộ tính năng và hiển thị trang thông báo Đang Nâng Cấp.</p>
                      </div>
                      <button
                        onClick={() => setFormState((s) => ({ ...s, maintenance_mode: !s.maintenance_mode }))}
                        className={`w-14 h-8 rounded-full relative transition-colors ${formState.maintenance_mode ? 'bg-orange-500' : 'bg-gray-200'}`}
                        aria-label="Bật/tắt chế độ bảo trì"
                      >
                        <div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-sm transition-transform ${formState.maintenance_mode ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <Card className="border-[#A4C3A2] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-[#5D7B6F] text-lg flex items-center gap-2">
                      <KeyRound className="w-5 h-5" /> Cấu hình Sinh viên
                    </CardTitle>
                    <CardDescription>Kiểm soát quy tắc đăng ký và phiên làm việc</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl">
                      <div>
                        <h4 className="font-bold text-gray-800">Cho phép tạo mới tài khoản</h4>
                        <p className="text-sm text-gray-500 mt-1">Học viên có thể trực tiếp đăng ký qua trang Register.</p>
                      </div>
                      <button
                        onClick={() => setFormState((s) => ({ ...s, allow_registration: !s.allow_registration }))}
                        className={`w-14 h-8 rounded-full relative transition-colors ${formState.allow_registration ? 'bg-[#A4C3A2]' : 'bg-gray-200'}`}
                        aria-label="Bật/tắt đăng ký tải khoản"
                      >
                        <div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-sm transition-transform ${formState.allow_registration ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl">
                      <div>
                        <h4 className="font-bold text-gray-800">Chống chia sẻ tài khoản</h4>
                        <p className="text-sm text-gray-500 mt-1">Tự động ban khi phát hiện nhiều thiết bị cùng đăng nhập (tính từ thứ 2 theo giờ VN).</p>
                      </div>
                      <button
                        onClick={() => setFormState((s) => ({ ...s, anti_sharing_enabled: !s.anti_sharing_enabled }))}
                        className={`w-14 h-8 rounded-full relative transition-colors ${formState.anti_sharing_enabled ? 'bg-[#A4C3A2]' : 'bg-gray-200'}`}
                        aria-label="Bật/tắt chống chia sẻ tài khoản"
                      >
                        <div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-sm transition-transform ${formState.anti_sharing_enabled ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {formState.anti_sharing_enabled && (
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-3 animate-in fade-in duration-200">
                        <label htmlFor="max_violations" className="text-sm font-semibold text-amber-800">
                          Ngưỡng vi phạm tối đa / tuần (Thứ 2 → Chủ nhật, giờ VN)
                        </label>
                        <Input
                          id="max_violations"
                          type="number"
                          min={3}
                          max={50}
                          value={formState.anti_sharing_max_violations ?? 10}
                          onChange={(e) => setFormState((s) => ({ ...s, anti_sharing_max_violations: parseInt(e.target.value) || 10 }))}
                          className="w-32 border-amber-200 focus:border-amber-500 focus:ring-amber-500/20 rounded-xl"
                        />
                        <p className="text-xs text-amber-600">
                          Nếu số lượng thiết bị (IP + User-Agent) duy nhất vượt ngưỡng này trong 1 tuần, học viên sẽ bị tự động khóa tài khoản.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Global Actions */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-[#5D7B6F] hover:bg-[#4a6358] shadow-md px-6"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Lưu cấu hình
              </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
