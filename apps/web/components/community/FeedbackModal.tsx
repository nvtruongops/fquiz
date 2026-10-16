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
  { value: 'bug' as const, label: 'Bug Report', icon: Bug },
  { value: 'feature' as const, label: 'Feature Request', icon: Lightbulb },
  { value: 'content' as const, label: 'Content Feedback', icon: BookOpen },
  { value: 'other' as const, label: 'Other', icon: MessageCircle },
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
      <DialogContent aria-describedby={undefined} className="sm:max-w-2xl rounded-[32px] p-6 sm:p-8 border border-border bg-card/95 backdrop-blur-3xl shadow-2xl z-50 text-card-foreground">
        <DialogTitle className="text-2xl font-black text-foreground mb-1">Feedback & Suggestions</DialogTitle>
        <p className="text-xs font-medium text-muted-foreground mb-5">Every piece of feedback helps improve FQuiz every day.</p>

        {success ? (
          <div className="flex flex-col items-center justify-center text-center space-y-6 py-10">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-foreground">Thank you!</h3>
              <p className="text-muted-foreground font-medium text-xs">
                Your feedback has been sent to our development team.
              </p>
            </div>
            <Button
              onClick={() => setSuccess(false)}
              variant="outline"
              className="rounded-xl px-6 border-border text-primary font-bold text-xs hover:bg-muted"
            >
              Submit More Feedback
            </Button>
          </div>
        ) : (
          <form onSubmit={handleFeedbackSubmit} className="space-y-5">
            <div className="space-y-2">
              <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1 block">
                Category
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
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                        : 'border-border bg-card text-muted-foreground hover:border-ring hover:bg-muted'
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
                    <label htmlFor="feedback-reason" className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                      Reason
                    </label>
                    <Textarea
                      id="feedback-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value.slice(0, 200))}
                      placeholder="Let us know the specific reason..."
                      className="h-[68px] rounded-2xl border-2 px-4 py-3 text-xs outline-none font-medium border-border bg-card text-card-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary focus:border-primary resize-none"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label htmlFor="feedback-detail" className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                Feedback Details
              </label>
              <Textarea
                id="feedback-detail"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
                placeholder="Describe your feedback in detail..."
                className="h-[130px] rounded-2xl border-2 px-4 py-3 text-xs outline-none font-medium border-border bg-card text-card-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary focus:border-primary resize-none"
              />
              <div className="flex justify-between items-center mt-1">
                {error ? <p className="text-xs font-bold text-destructive ml-1">{error}</p> : <span />}
                <p className="text-[10px] font-bold text-muted-foreground">
                  {1000 - message.length} characters remaining
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-black py-3.5 rounded-2xl transition-all shadow-md disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : rateLimited ? (
                <span className="text-xs">Retry in {Math.floor(cooldownSec / 60)}:{String(cooldownSec % 60).padStart(2, '0')}</span>
              ) : (
                <>
                  <span className="text-sm">Submit Feedback</span>
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
