'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Category, QuizFormData } from '@/types/quiz'
import { Plus, Check, X, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { withCsrfHeaders } from '@/lib/csrf'
import { useToast } from '@/lib/store/toast-store'
import { Button } from '@/components/ui/button'

interface EditorMetadataFormProps {
  form: QuizFormData
  setForm: React.Dispatch<React.SetStateAction<QuizFormData>>
  categories: Category[]
  isStudentMode: boolean
}

export function EditorMetadataForm({ 
  form, 
  setForm, 
  categories, 
  isStudentMode 
}: EditorMetadataFormProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isCreating, setIsCreating] = React.useState(false)
  const [newCatName, setNewCatName] = React.useState('')

  const createCatMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/categories`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error || 'Không thể tạo danh mục')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student', 'categories'] })
      setForm(p => ({ ...p, category_id: data.category._id }))
      setIsCreating(false)
      setNewCatName('')
      toast.success('Đã tạo môn học mới')
    },
    onError: (err: any) => toast.error(err.message)
  })

  const handleCreate = () => {
    if (!newCatName.trim()) return
    createCatMutation.mutate(newCatName.trim())
  }

  return (
    <div className="space-y-6">
        <Card className={cn(
          "bg-white border-none shadow-xl shadow-[#5D7B6F]/5 rounded-[32px] overflow-hidden",
          !form.category_id ? "ring-2 ring-orange-400 bg-orange-50/30" : "ring-1 ring-gray-100"
        )}>
          <CardHeader className="pb-3 px-6 sm:px-8">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white shadow-lg transition-all",
                !form.category_id ? "bg-orange-500 shadow-orange-200" : "bg-[#5D7B6F] shadow-[#5D7B6F]/20"
              )}>
                1
              </div>
              <div className="flex-1">
                <CardTitle className="text-[#5D7B6F] text-lg font-black uppercase tracking-tight flex items-center justify-between">
                  <span>Chọn Môn học {!form.category_id && <span className="text-red-600">*</span>}</span>
                  {isStudentMode && !isCreating && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setIsCreating(true)}
                      className="h-8 px-3 rounded-xl bg-[#5D7B6F]/5 text-[#5D7B6F] font-black text-[10px] uppercase tracking-widest hover:bg-[#5D7B6F] hover:text-white transition-all"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Tạo danh mục mới
                    </Button>
                  )}
                </CardTitle>
                {!form.category_id && !isCreating && (
                  <p className="text-[11px] font-bold text-orange-600/80 mt-0.5">
                     Bắt buộc: Vui lòng chọn môn học trước khi tiếp tục
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-8">
            {isCreating ? (
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex-1 relative">
                  <Input 
                    autoFocus
                    placeholder="Nhập tên môn học mới..." 
                    className="h-14 rounded-2xl border-2 border-[#5D7B6F] pl-5 pr-12 font-bold text-[#5D7B6F] bg-white shadow-inner"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreate()
                      if (e.key === 'Escape') setIsCreating(false)
                    }}
                    disabled={createCatMutation.isPending}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {createCatMutation.isPending ? (
                      <Loader2 className="w-5 h-5 text-[#5D7B6F] animate-spin" />
                    ) : (
                      <>
                        <button 
                          onClick={handleCreate}
                          className="p-1.5 rounded-lg bg-[#5D7B6F] text-white hover:bg-[#4A6359] transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setIsCreating(false)}
                          className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <Select
                value={form.category_id || undefined}
                onValueChange={(v) => {
                  if (v && v !== '__placeholder__') {
                    setForm((p) => ({ ...p, category_id: v }))
                  }
                }}
              >
                <SelectTrigger className={cn(
                  "h-14 rounded-2xl text-base font-black shadow-sm transition-all",
                  !form.category_id 
                    ? "border-2 border-orange-400 bg-white text-gray-500" 
                    : "border-gray-100 bg-gray-50/50 text-[#5D7B6F] focus:bg-white focus:ring-2 focus:ring-[#5D7B6F]/20"
                )}>
                  <SelectValue placeholder="— Chọn môn học để bắt đầu —" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                  {categories.length === 0 ? (
                    <SelectItem value="__no_category__" disabled className="font-bold text-gray-400 italic">
                      — Chưa có môn học —
                    </SelectItem>
                  ) : (
                    <>
                      <SelectItem value="__placeholder__" disabled className="text-gray-400 font-bold">
                        — Chọn môn học —
                      </SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat._id} value={cat._id} className="font-bold text-[#5D7B6F] rounded-xl hover:bg-[#5D7B6F]/5 transition-colors">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

      {(isStudentMode || form.category_id) && (
        <Card className="bg-white border-none shadow-xl shadow-[#5D7B6F]/5 rounded-[32px] overflow-hidden ring-1 ring-gray-100">
          <CardContent className="pt-8 px-6 sm:px-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#5D7B6F] uppercase tracking-wider">Mã môn / Mã đề</label>
                <Input
                  placeholder="Ví dụ: MLN131, CS101..."
                  value={form.course_code}
                  onChange={(e) => setForm(p => ({ ...p, course_code: e.target.value }))}
                  className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-bold text-[#5D7B6F]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-[#5D7B6F] uppercase tracking-wider">Chế độ hiển thị</label>
                <Select
                  value={isStudentMode ? 'private' : form.status}
                  onValueChange={(v: any) => setForm(p => ({ ...p, status: v }))}
                  disabled={isStudentMode}
                >
                  <SelectTrigger className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 font-bold text-[#5D7B6F]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    {isStudentMode ? (
                      <SelectItem value="private" className="font-bold text-xs">Riêng tư (Chỉ mình tôi)</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="published" className="font-bold text-xs">Công khai (Published)</SelectItem>
                        <SelectItem value="draft" className="font-bold text-xs">Bản nháp (Draft)</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#5D7B6F]">Mô tả bộ đề (Tùy chọn)</label>
              <Textarea
                placeholder="Nhập mô tả ngắn gọn về bộ đề thi này..."
                value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                className="rounded-xl border-[#A4C3A2] min-h-[100px] focus:ring-[#5D7B6F]"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
