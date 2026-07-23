'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Globe, Save, Loader2 } from 'lucide-react'
import { Settings } from '@/hooks/useAdminSettings'

interface GeneralSettingsCardProps {
  formState: Partial<Settings>
  setFormState: React.Dispatch<React.SetStateAction<Partial<Settings>>>
  onSave: () => void
  isSaving: boolean
}

export const GeneralSettingsCard = React.memo(function GeneralSettingsCard({
  formState,
  setFormState,
  onSave,
  isSaving,
}: GeneralSettingsCardProps) {
  return (
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

      <div className="flex justify-end pt-2">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="bg-[#5D7B6F] hover:bg-[#4a6358] shadow-md px-6 rounded-xl"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Lưu cấu hình Hiển thị
        </Button>
      </div>
    </div>
  )
})
