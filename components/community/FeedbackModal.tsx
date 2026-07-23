'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogTitle } from '@/components/shared/ui/dialog'
import { Textarea } from '@/components/shared/ui/textarea'
import { Button } from '@/components/shared/ui/button'
import { Bug, Lightbulb, BookOpen, MessageCircle, CheckCircle2, Loader2, Send } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import { FeedbackType } from '@/hooks/useCommunityFeed'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  type: FeedbackType
  setType: (val: FeedbackType) => void
  message: string
  setMessage: (val: string) => void
  reason: string
  setReason: (val: string) => void
  loading: boolean
  success: boolean
  setSuccess: (val: boolean) => void
  error: string
  rateLimited: boolean
  cooldownSec: number
  canSubmit: boolean
  handleFeedbackSubmit: (e: React.FormEvent) => void
}

const FEEDBACK_TYPE_OPTIONS = [
  { value: 'bug' as const, label: 'Báo lỗi', icon: Bug },
  { value: 'feature' as const, label: 'Đề xuất tính năng', icon: Lightbulb },
  { value: 'content' as const, label: 'Góp ý nội dung', icon: BookOpen },
  { value: 'other' as const, label: 'Khác', icon: MessageCircle },
]

export default function FeedbackModal({
  isOpen,
  onClose,
  type,
  setType,
  message,
  setMessage,
  reason,
  setReason,
  loading,
  success,
  setSuccess,
  error,
  rateLimited,
  cooldownSec,
  canSubmit,
  handleFeedbackSubmit,
}: FeedbackModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-2xl rounded-[32px] p-6 sm:p-8 border border-white/80 bg-white/95 backdrop-blur-3xl shadow-2xl z-50">
        <DialogTitle className="text-2xl font-black text-slate-800 mb-1">Góp ý phát triển FQuiz</DialogTitle>
        <p className="text-xs font-medium text-slate-500 mb-5">Mỗi ý kiến đóng góp của bạn đều giúp FQuiz hoàn thiện hơn mỗi ngày.</p>

        {success ? (
          <div className="flex flex-col items-center justify-center text-center space-y-6 py-10">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-[#5D7B6F]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-800">Cảm ơn bạn!</h3>
              <p className="text-slate-500 font-medium text-xs">
                Góp ý của bạn đã được gửi đến đội ngũ phát triển.
              </p>
            </div>
            <Button
              onClick={() => setSuccess(false)}
              variant="outline"
              className="rounded-xl px-6 border-slate-200 text-[#5D7B6F] font-bold text-xs"
            >
              Gửi thêm góp ý
            </Button>
          </div>
        ) : (
          <form onSubmit={handleFeedbackSubmit} className="space-y-5">
            <div className="space-y-2">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
                Phân loại
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FEEDBACK_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    className={cn(
                      'flex flex-col items-center gap-2 px-2 py-3 rounded-2xl border-2 transition-all cursor-pointer',
                      type === value
                        ? 'border-[#5D7B6F] bg-[#5D7B6F]/10 text-[#5D7B6F]'
                        : 'border-slate-200 bg-white/50 text-slate-500 hover:border-slate-300'
                    )}
                  >
                    <Icon className="w-5 h-5" strokeWidth={1.5} />
                    <span className="text-[10px] font-bold text-center uppercase tracking-wider">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {type === 'other' && (
                <motion.div
                  initial={{ opacity: 0, maxHeight: 0 }}
                  animate={{ opacity: 1, maxHeight: 120 }}
                  exit={{ opacity: 0, maxHeight: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5 pt-1">
                    <label htmlFor="feedback-reason" className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Lý do
                    </label>
                    <Textarea
                      id="feedback-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value.slice(0, 200))}
                      placeholder="Cho chúng tôi biết lý do cụ thể..."
                      className="h-[68px] rounded-2xl border-2 px-4 py-3 text-xs outline-none font-medium border-slate-200 bg-white text-slate-900 focus-visible:ring-1 focus-visible:ring-[#5D7B6F] focus-visible:ring-offset-0 focus-visible:border-[#5D7B6F] focus:border-[#5D7B6F] resize-none"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label htmlFor="feedback-detail" className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Chi tiết góp ý
              </label>
              <Textarea
                id="feedback-detail"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
                placeholder="Mô tả chi tiết góp ý của bạn..."
                className="h-[130px] rounded-2xl border-2 px-4 py-3 text-xs outline-none font-medium border-slate-200 bg-white text-slate-900 focus-visible:ring-1 focus-visible:ring-[#5D7B6F] focus-visible:ring-offset-0 focus-visible:border-[#5D7B6F] focus:border-[#5D7B6F] resize-none"
              />
              <div className="flex justify-between items-center mt-1">
                {error ? <p className="text-xs font-bold text-red-500 ml-1">{error}</p> : <span />}
                <p className="text-[10px] font-bold text-slate-400">
                  {1000 - message.length} ký tự còn lại
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2 bg-[#5D7B6F] hover:bg-[#4A6359] text-white font-black py-3.5 rounded-2xl transition-all shadow-md disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : rateLimited ? (
                <span className="text-xs">Thử lại sau {Math.floor(cooldownSec / 60)}:{String(cooldownSec % 60).padStart(2, '0')}</span>
              ) : (
                <>
                  <span className="text-sm">Gửi góp ý</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
