'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, X, BookOpen, Layers, Pin, Loader2, BellRing } from 'lucide-react'
import { Input } from '@/components/shared/ui/input'
import { Card, CardContent } from '@/components/shared/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/shared/ui/dialog'
import { Checkbox } from '@/components/shared/ui/checkbox'
import { motion } from 'framer-motion'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { cn } from '@/lib/core/utils/cn'

interface CategoryItem {
  id: string
  name: string
  quizCount?: number
}

interface CategoryFilterProps {
  initialCategories: CategoryItem[]
  initialPinnedCategories?: string[]
}

export default function CategoryFilter({ initialCategories, initialPinnedCategories }: CategoryFilterProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [pinningId, setPinningId] = useState<string | null>(null)
  const [notifyPromptCat, setNotifyPromptCat] = useState<{ id: string; name: string } | null>(null)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [enablingNotify, setEnablingNotify] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch student pinned categories
  const { data: pinnedData } = useQuery({
    queryKey: ['student', 'pinned-categories'],
    queryFn: async () => {
      const res = await fetch('/api/student/pinned-categories')
      if (!res.ok) return { pinnedCategories: [] }
      return res.json() as Promise<{ pinnedCategories: string[] }>
    },
    initialData: initialPinnedCategories ? { pinnedCategories: initialPinnedCategories } : undefined,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const pinnedSet = useMemo(() => new Set(pinnedData?.pinnedCategories || []), [pinnedData?.pinnedCategories])

  const handleTogglePin = async (e: React.MouseEvent, categoryId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setPinningId(categoryId)

    try {
      const res = await fetch('/api/student/pinned-categories', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ categoryId }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Không thể ghim danh mục')
      } else {
        queryClient.setQueryData(['student', 'pinned-categories'], { pinnedCategories: json.pinnedCategories })
        toast.success(json.pinned ? 'Đã ghim danh mục lên đầu' : 'Đã bỏ ghim danh mục')

        if (json.pinned) {
          try {
            const dismissed: string[] = JSON.parse(localStorage.getItem('fquiz_dismissed_pin_notif_cats') || '[]')
            if (!dismissed.includes(categoryId)) {
              const catObj = initialCategories.find((c) => c.id === categoryId)
              if (catObj) {
                setNotifyPromptCat({ id: catObj.id, name: catObj.name })
                setDontShowAgain(false)
              }
            }
          } catch {
            // ignore localStorage error
          }
        }
      }
    } catch {
      toast.error('Có lỗi khi ghim danh mục')
    } finally {
      setPinningId(null)
    }
  }

  const handleCloseModal = () => {
    if (dontShowAgain && notifyPromptCat) {
      try {
        const dismissed: string[] = JSON.parse(localStorage.getItem('fquiz_dismissed_pin_notif_cats') || '[]')
        if (!dismissed.includes(notifyPromptCat.id)) {
          dismissed.push(notifyPromptCat.id)
          localStorage.setItem('fquiz_dismissed_pin_notif_cats', JSON.stringify(dismissed))
        }
      } catch {
        // ignore localStorage error
      }
    }
    setNotifyPromptCat(null)
  }

  const handleEnableNotifications = async () => {
    setEnablingNotify(true)
    try {
      const res = await fetch('/api/student/settings', {
        method: 'PATCH',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          notify_email: true,
          notify_quiz_reminder: true,
        }),
      })
      if (res.ok) {
        toast.success(`Đã bật thông báo email cho môn ${notifyPromptCat?.name || ''}`)
      } else {
        toast.error('Không thể cập nhật cài đặt thông báo')
      }
    } catch {
      toast.error('Có lỗi xảy ra khi bật thông báo')
    } finally {
      setEnablingNotify(false)
      handleCloseModal()
    }
  }

  const filtered = initialCategories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sortedAndFiltered = [...filtered].sort((a, b) => {
    const aPinned = pinnedSet.has(a.id)
    const bPinned = pinnedSet.has(b.id)
    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1
    return 0
  })

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-4 sm:mb-8 relative max-w-xl mx-auto w-full px-2 sm:px-0"
      >
        <div className="relative group">
          {/* Subtle Glow Behind Input */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-primary/10 rounded-full blur-md opacity-30 group-hover:opacity-60 transition duration-500"></div>

          <div className="relative flex items-center">
            <Search className="absolute left-3.5 sm:left-4 text-primary h-4 w-4 pointer-events-none" />
            <Input
              placeholder="Tìm kiếm môn học (VD: DBS401, PRN211)..."
              className="w-full h-10 sm:h-12 pl-10 sm:pl-11 pr-9 text-xs sm:text-sm border border-input bg-card/90 backdrop-blur-xl rounded-full shadow-xs focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200 placeholder:text-muted-foreground font-medium text-foreground"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Xóa tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {sortedAndFiltered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-5 w-full">
          {sortedAndFiltered.map((cat) => {
            const isPinned = pinnedSet.has(cat.id)
            return (
              <motion.div
                key={cat.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <Card
                  className={cn(
                    'min-h-[120px] sm:min-h-[195px] h-full flex flex-col justify-between cursor-pointer transition-all duration-300 active:scale-[0.98] hover:-translate-y-1 hover:shadow-lg border bg-card backdrop-blur-2xl rounded-2xl sm:rounded-3xl overflow-hidden group relative',
                    isPinned ? 'border-question-flagged-border shadow-xs' : 'border-border hover:border-primary/50'
                  )}
                >
                  {/* Subtle inner highlight */}
                  <div className="absolute inset-0 border border-border/30 rounded-2xl sm:rounded-3xl pointer-events-none opacity-60"></div>

                  <Link href={`/courses/${encodeURIComponent(cat.name.toLowerCase())}`} className="block h-full w-full outline-none">
                    <CardContent className="p-2.5 sm:p-5 flex flex-col items-center justify-between w-full h-full min-h-[120px] sm:min-h-[195px] relative z-10 gap-1.5 sm:gap-3">
                      <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 group-hover:text-primary transition-all duration-300 shadow-xs shrink-0 mt-0.5">
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex-1 flex items-center justify-center w-full px-0.5 py-0.5">
                        <span
                          className="text-xs sm:text-base font-black text-center tracking-tight leading-tight sm:leading-snug break-words text-card-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2 sm:line-clamp-3 uppercase"
                        >
                          {cat.name}
                        </span>
                      </div>
                      {typeof cat.quizCount === 'number' && (
                        <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-muted text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary text-[9px] sm:text-xs font-black uppercase tracking-wider transition-colors shrink-0 border border-border/40">
                          <Layers className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          {cat.quizCount} đề thi
                        </span>
                      )}
                    </CardContent>
                  </Link>

                  {/* Pin Button */}
                  <button
                    type="button"
                    onClick={(e) => handleTogglePin(e, cat.id)}
                    disabled={pinningId === cat.id}
                    className={cn(
                      'absolute top-1.5 right-1.5 sm:top-3 sm:right-3 z-20 w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-90',
                      isPinned
                        ? 'bg-question-flagged-bg text-question-flagged-fg border border-question-flagged-border shadow-xs scale-105'
                        : 'bg-muted/80 text-muted-foreground hover:text-question-flagged-fg hover:bg-muted border border-border/50 shadow-xs'
                    )}
                    title={isPinned ? 'Bỏ ghim danh mục' : 'Ghim danh mục lên đầu'}
                  >
                    {pinningId === cat.id ? (
                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    ) : (
                      <Pin className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4', isPinned && 'fill-current')} />
                    )}
                  </button>
                </Card>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 sm:py-16 px-4 bg-white/60 backdrop-blur-2xl rounded-3xl border border-white/80 shadow-sm max-w-md mx-auto"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Search className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h3 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-tight">Không tìm thấy môn học</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1">Hãy thử tìm từ khóa khác như &quot;DBS&quot; hoặc &quot;PRN&quot;.</p>
        </motion.div>
      )}

      {/* Notification Prompt Modal */}
      <Dialog open={!!notifyPromptCat} onOpenChange={(open) => { if (!open) handleCloseModal() }}>
        <DialogContent className="sm:max-w-md rounded-3xl border border-[#5D7B6F]/20 p-6 bg-white shadow-2xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#5D7B6F]/10 text-[#5D7B6F] flex items-center justify-center mb-1">
              <BellRing className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-black text-slate-800">
              Bật thông báo email cho môn {notifyPromptCat?.name}?
            </DialogTitle>
            <DialogDescription asChild className="text-xs text-slate-500 font-medium">
              <div className="space-y-1.5 pt-1 text-center">
                <p>
                  Bạn vừa ghim môn học <strong className="text-slate-800 font-extrabold">{notifyPromptCat?.name}</strong>.
                </p>
                <p className="text-slate-600 font-semibold">
                  Bạn có muốn nhận email thông báo tự động mỗi khi môn học này có quiz mới không?
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 flex items-center space-x-2 border-t border-b border-slate-100 my-2">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(!!checked)}
            />
            <label htmlFor="dont-show-again" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
              Không hiển thị lại đối với danh mục này
            </label>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Để sau / Bỏ qua
            </button>
            <button
              type="button"
              onClick={handleEnableNotifications}
              disabled={enablingNotify}
              className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl bg-[#5D7B6F] hover:bg-[#4A6359] text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {enablingNotify ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
              Bật thông báo email
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
