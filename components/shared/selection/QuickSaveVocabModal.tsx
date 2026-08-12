'use client'

import React, { useState } from 'react'
import { BookMarked, Loader2, X } from 'lucide-react'

interface QuickSaveVocabModalProps {
  isOpen: boolean
  expression: string
  contextSentence?: string
  sourceType?: 'quiz' | 'flashcard' | 'lesson'
  sourceId?: string
  onClose: () => void
  onSavedSuccess?: () => void
}

export function QuickSaveVocabModal({
  isOpen,
  expression,
  contextSentence = '',
  sourceType = 'quiz',
  sourceId,
  onClose,
  onSavedSuccess,
}: QuickSaveVocabModalProps) {
  const [translation, setTranslation] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/v1/learning/vocabulary/quick-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expression,
          contextSentence,
          customTranslation: translation,
          personalNote: note,
          sourceType,
          sourceId,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Lưu thất bại')
      }

      setSuccessMsg(`Đã lưu "${expression}" vào sổ từ vựng cá nhân!`)
      setTimeout(() => {
        onSavedSuccess?.()
        onClose()
      }, 1000)
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi lưu từ vựng')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xl text-card-foreground overflow-hidden">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2 font-semibold text-base">
            <BookMarked className="h-5 w-5 text-primary" />
            <span>Lưu từ vựng / Cụm từ cá nhân</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-accent text-muted-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 overflow-y-auto flex-1 px-1.5 py-1 -mx-1 text-card-foreground">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Từ / Cụm từ gốc
            </label>
            <div className="p-2.5 rounded-md bg-muted text-sm font-semibold text-foreground border border-border">
              {expression}
            </div>
          </div>

          {contextSentence && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Ngữ cảnh trong câu
              </label>
              <p className="text-xs italic text-muted-foreground bg-muted/50 p-2 rounded border border-border/50 max-h-24 overflow-y-auto">
                &quot;{contextSentence}&quot;
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Bản dịch / Nghĩa của bạn
            </label>
            <input
              type="text"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="Nhập nghĩa bằng tiếng Việt hoặc tiếng Anh..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Ghi chú cá nhân (tùy chọn)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: dùng trong ngữ cảnh trang trọng..."
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 transition-all resize-none max-h-24"
            />
          </div>

          {error && (
            <div className="p-2 rounded bg-destructive/10 text-destructive text-xs">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              {successMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-input hover:bg-accent transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BookMarked className="h-3.5 w-3.5" />
              )}
              <span>Lưu vào sổ FSRS</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
