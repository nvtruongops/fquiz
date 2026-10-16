'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePinnedQuestions, PinnedQuestionItem } from '@/hooks/quiz/usePinnedQuestions'
import { Bookmark, BookmarkCheck, Trash2, PlusCircle, AlertCircle, FileText, CheckCircle2, Loader2, Info, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
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
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const isAllExpanded = pinnedQuestions.length > 0 && pinnedQuestions.every((item: PinnedQuestionItem) => expandedIds[item._id])

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedIds({})
    } else {
      const allMap: Record<string, boolean> = {}
      pinnedQuestions.forEach((item: PinnedQuestionItem) => {
        allMap[item._id] = true
      })
      setExpandedIds(allMap)
    }
  }

  const handleCreateQuiz = () => {
    if (pinnedQuestions.length === 0) {
      toast.info('You have not pinned any questions in this course.')
      return
    }

    createQuizFromPinnedMutation.mutate(
      { course_code: normalizedCode },
      {
        onSuccess: (data) => {
          if (data.quiz?._id) {
            router.push(`/quiz/${data.quiz._id}`)
          }
        },
        onError: (err: any) => {
          if (err.quotaExceeded) {
            setQuotaMessage(err.message || 'You have reached the maximum limit of 10 custom/mixed quizzes.')
            setQuotaModalOpen(true)
          } else {
            toast.error(err.message || 'Failed to create quiz from pinned questions.')
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
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading pinned questions...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="bg-card/80 backdrop-blur-xl border border-border/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning-bg/40 text-warning-fg font-black border border-warning-border/60 shadow-2xs">
            <Bookmark className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-foreground uppercase tracking-tight">
                Pinned Questions ({pinnedQuestions.length})
              </h2>
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/15 text-primary border border-primary/20">
                {normalizedCode}
              </span>
            </div>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">
              Focused questions you have pinned while studying {normalizedCode}
            </p>
          </div>
        </div>

        {pinnedQuestions.length > 0 && (
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleExpandAll}
              className="h-10 px-4 rounded-xl border-border/80 text-foreground hover:bg-muted font-black text-xs transition-all cursor-pointer"
            >
              {isAllExpanded ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  Collapse answers
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  Expand all answers
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmClearOpen(true)}
              disabled={clearAllPinsMutation.isPending}
              className="h-10 px-4 rounded-xl border-destructive/30 text-destructive hover:text-destructive-foreground hover:bg-destructive font-black text-xs transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Clear all
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleCreateQuiz}
              disabled={createQuizFromPinnedMutation.isPending}
              className="h-10 px-5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-black text-xs shadow-md shadow-primary/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              {createQuizFromPinnedMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <PlusCircle className="w-4 h-4" />
              )}
              Create quiz ({pinnedQuestions.length} questions)
            </Button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {pinnedQuestions.length === 0 ? (
        <div className="bg-card/70 backdrop-blur-xl border border-border/80 rounded-3xl p-10 sm:p-14 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground border border-border">
            <Bookmark className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-black text-foreground uppercase tracking-tight">
              No pinned questions yet
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              While practicing quizzes for <strong className="text-foreground font-bold">{normalizedCode}</strong>, tap the Pin icon on any question to bookmark it here for targeted revision.
            </p>
          </div>
        </div>
      ) : (
        /* Pinned Questions List */
        <div className="space-y-3.5">
          <AnimatePresence mode="popLayout">
            {pinnedQuestions.map((item: PinnedQuestionItem, index: number) => {
              const answers = item.correct_answer || [0]
              const isExpanded = !!expandedIds[item._id]

              return (
                <motion.div
                  key={item._id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-card/90 backdrop-blur-xl border border-border/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all space-y-3.5 relative group overflow-hidden"
                >
                  {/* Top metadata header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-primary/10 text-primary">
                        Question {index + 1}
                      </span>

                      {/* Display source quiz title / code */}
                      {item.quiz_title && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
                          <FileText className="w-3 h-3 text-muted-foreground" />
                          <span>Quiz: <strong>{item.quiz_title}</strong></span>
                        </span>
                      )}
                    </div>

                    {/* Single Delete Button */}
                    <button
                      type="button"
                      onClick={() => deletePinMutation.mutate(item._id)}
                      disabled={deletePinMutation.isPending}
                      className="p-1.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Remove pinned question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Question Text (Clickable to toggle expand) */}
                  <div className="space-y-2">
                    <div
                      onClick={() => toggleExpand(item._id)}
                      className="cursor-pointer group/title"
                    >
                      <p className="text-sm sm:text-base font-bold text-foreground whitespace-pre-wrap leading-relaxed group-hover/title:text-primary transition-colors">
                        {item.text}
                      </p>
                    </div>

                    {item.image_url && (
                      <div className="mt-2 max-w-sm rounded-xl border border-border p-2 bg-muted/50">
                        <img
                          src={item.image_url}
                          alt="Illustration"
                          className="max-h-48 w-full object-contain rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  {/* Toggle Answer Button */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => toggleExpand(item._id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-primary font-bold text-xs transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Hide answers</span>
                          <ChevronUp className="w-4 h-4 ml-0.5" />
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Show answers</span>
                          <ChevronDown className="w-4 h-4 ml-0.5" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Expandable Options List & Explanation */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3 pt-3 border-t border-border overflow-hidden"
                      >
                        {/* Options List */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {item.options.map((opt: string, optIdx: number) => {
                            const isCorrect = answers.includes(optIdx)
                            return (
                              <div
                                key={`${optIdx}-${opt}`}
                                className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 transition-colors ${
                                  isCorrect
                                    ? 'border-success-fg/80 bg-success-bg/20 text-success-fg font-semibold'
                                    : 'border-border bg-muted/40 text-foreground'
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] flex-none mt-0.5 ${
                                    isCorrect
                                      ? 'bg-success-fg text-primary-foreground'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {String.fromCodePoint(65 + optIdx)}
                                </span>
                                <span className="flex-1 whitespace-pre-wrap">{opt}</span>
                                {isCorrect && (
                                  <CheckCircle2 className="w-4 h-4 text-success-fg flex-none self-center" />
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
                              <strong className="font-bold">Explanation: </strong>
                              <span>{item.explanation}</span>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Clear All Confirmation Dialog */}
      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent className="max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl text-card-foreground">
          <DialogHeader className="text-center sm:text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <Trash2 className="h-7 w-7" />
            </div>
            <DialogTitle className="text-center text-lg font-black text-card-foreground">
              Clear all pinned questions?
            </DialogTitle>
            <DialogDescription className="text-center text-xs leading-relaxed text-muted-foreground">
              Are you sure you want to clear all <strong className="text-destructive font-bold">{pinnedQuestions.length} pinned questions</strong> for course {normalizedCode}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmClearOpen(false)}
              className="flex-1 h-11 rounded-xl border-border text-muted-foreground hover:bg-muted font-semibold text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmClear}
              disabled={clearAllPinsMutation.isPending}
              className="flex-1 h-11 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-xs cursor-pointer"
            >
              {clearAllPinsMutation.isPending ? 'Clearing...' : 'Clear all'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quota Exceeded Modal */}
      <Dialog open={quotaModalOpen} onOpenChange={setQuotaModalOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl text-card-foreground">
          <DialogHeader className="text-center sm:text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-bg text-warning-fg">
              <AlertCircle className="h-7 w-7" />
            </div>
            <DialogTitle className="text-center text-lg font-black text-card-foreground">
              Quiz Quota Limit Reached
            </DialogTitle>
            <DialogDescription className="text-center text-xs leading-relaxed text-muted-foreground">
              {quotaMessage || 'You have reached the maximum limit of 10 custom and mixed quizzes. Please delete an older quiz to continue.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuotaModalOpen(false)}
              className="flex-1 h-11 rounded-xl border-border text-muted-foreground hover:bg-muted font-semibold text-xs cursor-pointer"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                setQuotaModalOpen(false)
                router.push('/explore')
              }}
              className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs cursor-pointer"
            >
              Explore Quizzes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
