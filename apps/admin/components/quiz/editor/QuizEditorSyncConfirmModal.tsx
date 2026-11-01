import React from 'react'
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import type { ParsedFilePreview, BankCheckDetail } from '@/hooks/quiz/types'
import { useTranslations } from '@fquiz/ui/i18n'

interface QuizEditorSyncConfirmModalProps {
  open: boolean
  onClose: () => void
  isSyncing: boolean
  filePreview: ParsedFilePreview | null
  fileConflictItems: BankCheckDetail[]
  onConfirmSync: () => void
}

export function QuizEditorSyncConfirmModal({
  open,
  onClose,
  isSyncing,
  filePreview,
  fileConflictItems,
  onConfirmSync,
}: QuizEditorSyncConfirmModalProps) {
  const t = useTranslations()
  if (!open || !filePreview) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="max-w-xl w-full border-border bg-card shadow-2xl overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200">
        <CardHeader className="p-5 pb-3.5 border-b border-border bg-destructive/10">
          <div className="flex items-center gap-2.5 text-destructive font-bold text-base">
            <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{t('sync.confirmTitle', { count: fileConflictItems.length })}</span>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            {t('sync.confirmDescription', { count: fileConflictItems.length })}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-3 max-h-[360px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            {t('sync.conflictingQuestions')}
          </span>
          <div className="space-y-2.5">
            {fileConflictItems.map((detail) => {
              const qIndex = detail.questionIndex
              const rawQ = filePreview.rawQuestions[qIndex]
              return (
                <div
                  key={qIndex}
                  className="p-3 rounded-xl border border-border bg-muted/20 space-y-2 text-xs"
                >
                  <div className="font-bold text-foreground">
                    {t('sync.question', { number: qIndex + 1 })}: {rawQ?.text}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    <div className="p-2.5 rounded-lg bg-success-bg border border-success-border text-success-fg">
                      <span className="block font-bold text-[10px] uppercase">{t('sync.newAnswer')}</span>
                      <span className="font-semibold text-xs">{detail.uploaded.answer_texts.join(', ')}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
                      <span className="block font-bold text-[10px] uppercase">{t('sync.previousAnswer')}</span>
                      <span className="font-semibold text-xs">{detail.bank?.answer_texts.join(', ')}</span>
                    </div>
                  </div>
                  {detail.bank?.quizzes && detail.bank.quizzes.length > 0 && (
                    <p className="text-[11px] text-muted-foreground pt-0.5">
                      {t('sync.updateQuizAnswers', { count: detail.bank.quizzes.length })} <strong className="font-mono text-foreground">{detail.bank.quizzes.map((qz) => qz.course_code).join(', ')}</strong>
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>

        <div className="p-4 border-t border-border bg-muted/20 flex flex-col-reverse sm:flex-row justify-end gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSyncing}
            onClick={onClose}
            className="cursor-pointer"
          >
            {t('sync.cancelBack')}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSyncing}
            onClick={onConfirmSync}
            className="font-bold gap-2 cursor-pointer bg-warning-bg hover:bg-warning-bg/80 text-warning-fg border border-warning-border shadow-xs transition-all"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            )}
            {t('sync.confirmApply')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
