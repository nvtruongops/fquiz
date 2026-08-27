'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select'
import { Input } from '@/components/shared/ui/input'
import { Textarea } from '@/components/shared/ui/textarea'
import { cn } from '@/lib/core/utils/cn'
import { Category, QuizFormData } from '@/lib/modules/quiz/types/quiz'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import { useDebounce } from '@/hooks/shared/useDebounce'
import { getCsrfTokenFromCookie } from '@/lib/core/security/csrf'

interface EditorMetadataFormProps {
  form: QuizFormData
  setForm: React.Dispatch<React.SetStateAction<QuizFormData>>
  categories: Category[]
  isStudentMode?: boolean
  quizId?: string
}

export function EditorMetadataForm({ 
  form, 
  setForm, 
  categories, 
  isStudentMode = false,
  quizId
}: EditorMetadataFormProps) {
  const [checkingCode, setCheckingCode] = React.useState(false)
  const [codeDuplicate, setCodeDuplicate] = React.useState<{
    exists: boolean
    quiz?: { _id: string; title: string; course_code: string; questionCount: number }
  } | null>(null)

  const debouncedCourseCode = useDebounce(form.course_code, 500)

  React.useEffect(() => {
    const code = debouncedCourseCode.trim()
    if (!code) {
      setCodeDuplicate(null)
      setCheckingCode(false)
      return
    }

    let isMounted = true
    setCheckingCode(true)

    const csrfToken = getCsrfTokenFromCookie()
    const excludeParam = quizId ? `&excludeId=${encodeURIComponent(quizId)}` : ''
    fetch(`/api/student/quizzes/check-code?code=${encodeURIComponent(code)}${excludeParam}`, {
      headers: {
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return
        if (data && data.exists) {
          setCodeDuplicate(data)
        } else {
          setCodeDuplicate({ exists: false })
        }
      })
      .catch(() => {
        if (!isMounted) return
        setCodeDuplicate(null)
      })
      .finally(() => {
        if (isMounted) setCheckingCode(false)
      })

    return () => {
      isMounted = false
    }
  }, [debouncedCourseCode, quizId])

  return (
    <div className="space-y-6">
      <Card className={cn(
        "bg-card border border-border shadow-xs rounded-[32px] overflow-hidden",
        !form.category_id ? "ring-2 ring-amber-500/50 bg-amber-500/5" : ""
      )}>
        <CardHeader className="pb-3 px-6 sm:px-8">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white shadow-md transition-all",
              !form.category_id ? "bg-amber-500 shadow-amber-500/20" : "bg-primary shadow-primary/20"
            )}>
              1
            </div>
            <div className="flex-1">
              <CardTitle className="text-primary text-lg font-black uppercase tracking-tight flex items-center justify-between">
                <span>Chọn Môn học {!form.category_id && <span className="text-destructive">*</span>}</span>
              </CardTitle>
              {!form.category_id && (
                <p className="text-[11px] font-bold text-amber-500 mt-0.5">
                   Bắt buộc: Vui lòng chọn môn học trước khi tiếp tục
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-8">
          <Select
            value={form.category_id || undefined}
            onValueChange={(v) => {
              if (v && v !== '__placeholder__') {
                setForm((p) => ({ ...p, category_id: v }))
              }
            }}
          >
            <SelectTrigger className={cn(
              "h-14 rounded-2xl text-base font-bold shadow-2xs transition-all",
              !form.category_id 
                ? "border-2 border-amber-500/80 bg-card text-muted-foreground" 
                : "border-border bg-card text-foreground focus:ring-2 focus:ring-primary/20"
            )}>
              <SelectValue placeholder="— Chọn môn học để bắt đầu —" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border border-border bg-card text-card-foreground shadow-2xl p-2">
              {categories.length === 0 ? (
                <SelectItem value="__no_category__" disabled className="font-bold text-muted-foreground italic">
                  — Chưa có môn học —
                </SelectItem>
              ) : (
                <>
                  <SelectItem value="__placeholder__" disabled className="text-muted-foreground font-bold">
                    — Chọn môn học —
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id} className="font-bold text-foreground rounded-xl hover:bg-primary/10 transition-colors cursor-pointer">
                      {cat.name}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {(isStudentMode || form.category_id) && (
        <Card className="bg-card border border-border shadow-xs rounded-[32px] overflow-hidden">
          <CardContent className="pt-8 px-6 sm:px-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="course-code-input" className="text-[11px] font-black text-primary uppercase tracking-wider">Mã môn / Mã đề</label>
                <div className="relative">
                  <Input
                    id="course-code-input"
                    placeholder="Ví dụ: MLN 131: DE-01"
                    value={form.course_code}
                    maxLength={150}
                    onChange={(e) => setForm(p => ({ ...p, course_code: e.target.value }))}
                    className={cn(
                      "h-12 rounded-2xl border-border bg-background transition-all font-bold text-foreground pr-10",
                      codeDuplicate?.exists && "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/10"
                    )}
                  />
                  {checkingCode && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    </div>
                  )}
                </div>

                {codeDuplicate && codeDuplicate.exists && (
                  <div className="flex items-start gap-1.5 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 animate-in fade-in duration-200">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Cảnh báo trùng mã đề:</span> Mã <code className="bg-amber-500/20 px-1 py-0.5 rounded font-mono font-bold text-amber-500">{codeDuplicate.quiz?.course_code}</code> đã được sử dụng bởi quiz: <span className="font-semibold">&quot;{codeDuplicate.quiz?.title}&quot;</span> ({codeDuplicate.quiz?.questionCount} câu).
                      <p className="text-[11px] text-amber-500/80 mt-0.5">Vui lòng thay đổi mã đề (ví dụ: {form.course_code}_V2) để tránh trùng lặp.</p>
                    </div>
                  </div>
                )}

                {codeDuplicate && !codeDuplicate.exists && form.course_code.trim() && !checkingCode && (
                  <div className="flex items-center gap-1.5 text-xs text-primary font-bold px-1">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    <span>Mã đề khả dụng (chưa trùng lặp)</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-black text-primary uppercase tracking-wider block">Chế độ hiển thị</span>
                <Select
                  value={form.status}
                  onValueChange={(v: any) => setForm(p => ({ ...p, status: v }))}
                >
                  <SelectTrigger className="h-12 rounded-2xl border-border bg-background font-bold text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
                    <SelectItem value="published" className="font-bold text-xs">Công khai (Published)</SelectItem>
                    <SelectItem value="draft" className="font-bold text-xs">Bản nháp (Draft)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="description-textarea" className="text-sm font-bold text-primary">Mô tả bộ đề (Tùy chọn)</label>
              <Textarea
                id="description-textarea"
                placeholder="Nhập mô tả ngắn gọn về bộ đề thi này..."
                value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                className="rounded-xl border-border min-h-[100px] focus:ring-primary bg-background text-foreground"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
