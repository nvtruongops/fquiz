'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePinnedQuestions, PinnedQuestionItem } from '@/hooks/quiz/usePinnedQuestions'
import { Bookmark, BookmarkCheck, Trash2, PlusCircle, AlertCircle, FileText, CheckCircle2, Loader2, Info } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shared/ui/dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/store/shared/toast-store'

interface PinnedQuestionsTabProps {
  courseCode: string
}

export default function PinnedQuestionsTab({ courseCode }: PinnedQuestionsTabProps) {
  const router = useRouter()
  const { toast } = useToast()
  const normalizedCode = courseCode.toUpperCase()

  const {
    pinnedQuestions,
    isLoading,
    deletePinMutation,
    clearAllPinsMutation,
    createQuizFromPinnedMutation,
  } = usePinnedQuestions(normalizedCode)

  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [quotaModalOpen, setQuotaModalOpen] = useState(false)
  const [quotaMessage, setQuotaMessage] = useState('')

  const handleCreateQuiz = () => {
    if (pinnedQuestions.length === 0) {
      toast.info('Bạn chưa ghim câu hỏi nào trong môn này.')
      return
    }

    createQuizFromPinnedMutation.mutate(
      { course_code: normalizedCode },
      {
        onSuccess: (data) => {
          if (data.quiz?._id) {
            router.push(`/my-quizzes`)
          }
        },
        onError: (err: any) => {
          if (err.quotaExceeded) {
            setQuotaMessage(err.message || 'Bạn đã đạt giới hạn tối đa 10 bộ đề tự tạo/trộn.')
            setQuotaModalOpen(true)
          } else {
            toast.error(err.message || 'Không thể tạo bộ đề từ các câu đã ghim.')
          }
        },
      }
    )
  }

  const handleConfirmClear = () => {
    clearAllPinsMutation.mutate(normalizedCode, {
      onSuccess: () => {
        setConfirmClearOpen(false)
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <Loader2 className="w-8 h-8 text-[#5D7B6F] animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Đang tải câu hỏi đã ghim...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5D7B6F]/10 text-[#5D7B6F] font-bold">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                Câu hỏi đã ghim ({pinnedQuestions.length})
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#5D7B6F]/15 text-[#5D7B6F]">
                {normalizedCode}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Danh sách các câu hỏi bạn đã ghim khi làm bài thuộc môn {normalizedCode}
            </p>
          </div>
        </div>

        {pinnedQuestions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmClearOpen(true)}
              disabled={clearAllPinsMutation.isPending}
              className="h-10 px-3.5 rounded-xl border-slate-200 dark:border-slate-800 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold text-xs transition-all"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Xóa tất cả
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateQuiz}
              disabled={createQuizFromPinnedMutation.isPending}
              className="h-10 px-4 rounded-xl bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-bold text-xs shadow-md shadow-[#5D7B6F]/20 transition-all flex items-center gap-1.5"
            >
              {createQuizFromPinnedMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <PlusCircle className="w-4 h-4" />
              )}
              Tạo bài kiểm tra ({pinnedQuestions.length} câu)
            </Button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {pinnedQuestions.length === 0 ? (
        <div className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-10 sm:p-14 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <Bookmark className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Chưa có câu hỏi nào được ghim
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Trong quá trình ôn luyện làm bài môn <strong className="text-slate-700 dark:text-slate-300 font-semibold">{normalizedCode}</strong>, hãy nhấn nút icon Ghim trên từng câu hỏi để lưu lại các câu cần ôn tập tại đây.
            </p>
          </div>
        </div>
      ) : (
        /* Pinned Questions List */
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {pinnedQuestions.map((item: PinnedQuestionItem, index: number) => {
              const answers = item.correct_answer || [0]
              return (
                <motion.div
                  key={item._id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-4 relative group"
                >
                  {/* Top metadata header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-[#5D7B6F]/10 text-[#5D7B6F]">
                        Câu {index + 1}
                      </span>

                      {/* Display source quiz title / code */}
                      {item.quiz_title && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                          <FileText className="w-3 h-3 text-slate-400" />
                          <span>Mã quiz: <strong>{item.quiz_title}</strong></span>
                        </span>
                      )}
                    </div>

                    {/* Single Delete Button */}
                    <button
                      type="button"
                      onClick={() => deletePinMutation.mutate(item._id)}
                      disabled={deletePinMutation.isPending}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Xóa câu ghim"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Question Content */}
                  <div className="space-y-2">
                    <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                      {item.text}
                    </p>

                    {item.image_url && (
                      <div className="mt-3 max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 p-2 bg-slate-50 dark:bg-slate-850">
                        <img
                          src={item.image_url}
                          alt="Minh họa"
                          className="max-h-48 w-full object-contain rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  {/* Options List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {item.options.map((opt: string, optIdx: number) => {
                      const isCorrect = answers.includes(optIdx)
                      return (
                        <div
                          key={`${optIdx}-${opt}`}
                          className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 transition-colors ${
                            isCorrect
                              ? 'border-emerald-500/80 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                              : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] flex-none mt-0.5 ${
                              isCorrect
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {String.fromCodePoint(65 + optIdx)}
                          </span>
                          <span className="flex-1 whitespace-pre-wrap">{opt}</span>
                          {isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-none self-center" />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Explanation if exists */}
                  {item.explanation && (
                    <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2 mt-2">
                      <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-none mt-0.5" />
                      <div>
                        <strong className="font-bold">Giải thích: </strong>
                        <span>{item.explanation}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Clear All Confirmation Dialog */}
      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent className="max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
          <DialogHeader className="text-center sm:text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <Trash2 className="h-7 w-7" />
            </div>
            <DialogTitle className="text-center text-lg font-black text-slate-900 dark:text-slate-100">
              Xóa tất cả câu đã ghim?
            </DialogTitle>
            <DialogDescription className="text-center text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Bạn có chắc chắn muốn xóa toàn bộ <strong className="text-rose-600 font-bold">{pinnedQuestions.length} câu hỏi đã ghim</strong> của môn {normalizedCode} không? Thao tác này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmClearOpen(false)}
              className="flex-1 h-11 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs"
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              onClick={handleConfirmClear}
              disabled={clearAllPinsMutation.isPending}
              className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              {clearAllPinsMutation.isPending ? 'Đang xóa...' : 'Xóa tất cả'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quota Exceeded Modal */}
      <Dialog open={quotaModalOpen} onOpenChange={setQuotaModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
          <DialogHeader className="text-center sm:text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <AlertCircle className="h-7 w-7" />
            </div>
            <DialogTitle className="text-center text-lg font-black text-slate-900 dark:text-slate-100">
              Đã đạt giới hạn Quota bộ đề
            </DialogTitle>
            <DialogDescription className="text-center text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {quotaMessage || 'Tài khoản của bạn đã tạo đạt giới hạn tối đa 10 bộ đề (tự tạo + trộn). Vui lòng xóa bớt 1 bài cũ tại "Bộ đề của tôi" để tiếp tục tạo bài mới.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuotaModalOpen(false)}
              className="flex-1 h-11 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs"
            >
              Đóng
            </Button>
            <Button
              type="button"
              onClick={() => {
                setQuotaModalOpen(false)
                router.push('/my-quizzes')
              }}
              className="flex-1 h-11 rounded-xl bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-bold text-xs"
            >
              Đến Bộ đề của tôi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
