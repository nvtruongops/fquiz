'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { KeyRound, Save, Loader2 } from 'lucide-react'
import { Settings } from '@/hooks/useAdminSettings'

interface SecuritySettingsCardProps {
  formState: Partial<Settings>
  setFormState: React.Dispatch<React.SetStateAction<Partial<Settings>>>
  onSave: () => void
  isSaving: boolean
}

export const SecuritySettingsCard = React.memo(function SecuritySettingsCard({
  formState,
  setFormState,
  onSave,
  isSaving,
}: SecuritySettingsCardProps) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
      <Card className="border-border bg-card text-card-foreground shadow-sm">
        <CardHeader>
          <CardTitle className="text-primary text-lg flex items-center gap-2">
            <KeyRound className="w-5 h-5" /> Cấu hình Sinh viên
          </CardTitle>
          <CardDescription className="text-muted-foreground">Kiểm soát quy tắc đăng ký và phiên làm việc</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between p-4 bg-muted border border-border rounded-xl">
            <div>
              <h4 className="font-bold text-card-foreground">Cho phép tạo mới tài khoản</h4>
              <p className="text-sm text-muted-foreground mt-1">Học viên có thể trực tiếp đăng ký qua trang Register.</p>
            </div>
            <button
              onClick={() => setFormState((s) => ({ ...s, allow_registration: !s.allow_registration }))}
              className={`w-14 h-8 rounded-full relative transition-colors ${formState.allow_registration ? 'bg-primary' : 'bg-muted'}`}
              aria-label="Bật/tắt đăng ký tài khoản"
            >
              <div className={`w-6 h-6 bg-card rounded-full absolute top-1 shadow-sm transition-transform ${formState.allow_registration ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted border border-border rounded-xl">
            <div>
              <h4 className="font-bold text-card-foreground">Chống chia sẻ tài khoản</h4>
              <p className="text-sm text-muted-foreground mt-1">Tự động ban khi phát hiện nhiều thiết bị cùng đăng nhập (tính từ thứ 2 theo giờ VN).</p>
            </div>
            <button
              onClick={() => setFormState((s) => ({ ...s, anti_sharing_enabled: !s.anti_sharing_enabled }))}
              className={`w-14 h-8 rounded-full relative transition-colors ${formState.anti_sharing_enabled ? 'bg-primary' : 'bg-muted'}`}
              aria-label="Bật/tắt chống chia sẻ tài khoản"
            >
              <div className={`w-6 h-6 bg-card rounded-full absolute top-1 shadow-sm transition-transform ${formState.anti_sharing_enabled ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          {formState.anti_sharing_enabled && (
            <div className="p-4 bg-warning-bg border border-warning-border rounded-xl space-y-3 animate-in fade-in duration-200">
              <label htmlFor="max_violations" className="text-sm font-semibold text-warning-fg">
                Ngưỡng vi phạm tối đa / tuần (Thứ 2 → Chủ nhật, giờ VN)
              </label>
              <Input
                id="max_violations"
                type="number"
                min={3}
                max={50}
                value={formState.anti_sharing_max_violations ?? 5}
                onChange={(e) => setFormState((s) => ({ ...s, anti_sharing_max_violations: Number.parseInt(e.target.value, 10) || 5 }))}
                className="border-warning-border focus:border-primary rounded-xl bg-card text-card-foreground w-32"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md px-6 rounded-xl cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Lưu cấu hình Bảo mật
        </Button>
      </div>
    </div>
  )
})
