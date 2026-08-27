'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Globe, Save, Loader2, Wrench } from 'lucide-react'
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
      <Card className="border-border bg-card text-card-foreground shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground text-base font-bold flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" /> Thông tin Dự án
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs">Cấu hình các thông tin công khai hiển thị trên hệ thống</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="app_name" className="text-xs font-semibold text-foreground uppercase tracking-wider">Tên ứng dụng</label>
            <Input
              id="app_name"
              value={formState.app_name ?? ''}
              onChange={(e) => setFormState((s) => ({ ...s, app_name: e.target.value }))}
              className="bg-background border-border focus:border-primary text-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="app_description" className="text-xs font-semibold text-foreground uppercase tracking-wider">Mô tả ngắn (SEO)</label>
            <textarea
              id="app_description"
              rows={3}
              value={formState.app_description ?? ''}
              onChange={(e) => setFormState((s) => ({ ...s, app_description: e.target.value }))}
              className="w-full resize-none border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card text-card-foreground shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground text-base font-bold flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" /> Trạng thái Hệ thống
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs">Quản lý chế độ bảo trì và tạm dừng truy cập</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/40 border border-border rounded-xl">
            <div className="space-y-1 pr-4">
              <h4 className="font-semibold text-foreground text-sm">Chế độ bảo trì hệ thống</h4>
              <p className="text-xs text-muted-foreground">Đóng toàn bộ tính năng và hiển thị trang thông báo Đang Nâng Cấp.</p>
            </div>
            <Switch
              checked={Boolean(formState.maintenance_mode)}
              onCheckedChange={(checked) => setFormState((s) => ({ ...s, maintenance_mode: checked }))}
              aria-label="Bật/tắt chế độ bảo trì"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm px-6 rounded-xl cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Lưu cấu hình Hiển thị
        </Button>
      </div>
    </div>
  )
})
