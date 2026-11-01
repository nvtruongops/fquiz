import React from 'react'
import { useTranslations } from '@fquiz/ui/i18n'

interface UploadQuickJumpBarProps {
  conflictIndices: number[]
  newIndices: number[]
  reusedIndices: number[]
  onScrollToReviewQuestion: (qIndex: number) => void
}

export function UploadQuickJumpBar({
  conflictIndices,
  newIndices,
  reusedIndices,
  onScrollToReviewQuestion,
}: UploadQuickJumpBarProps) {
  const t = useTranslations()
  return (
    <div className="flex flex-col gap-2 pt-2 border-t border-border/60 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-bold text-foreground">{t('adminUpload.quickJump')}</span>
        <span className="text-[11px] text-muted-foreground">{t('adminUpload.clickQuestionNumber')}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {conflictIndices.length > 0 && (
          <div className="flex items-center gap-1 bg-destructive/10 border border-destructive/30 rounded-lg p-1.5 flex-wrap">
            <span className="font-bold text-destructive px-1">{t('adminUpload.conflicts')}</span>
            {conflictIndices.map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onScrollToReviewQuestion(idx)}
                className="w-6 h-6 rounded-md bg-destructive text-destructive-foreground font-bold text-xs hover:opacity-80 transition-opacity flex items-center justify-center cursor-pointer"
                title={t('adminUpload.jumpQuestion', { number: idx + 1 })}
                aria-label={t('adminUpload.jumpConflictQuestion', { number: idx + 1 })}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        )}

        {newIndices.length > 0 && (
          <div className="flex items-center gap-1 bg-primary/10 border border-primary/30 rounded-lg p-1.5 flex-wrap">
            <span className="font-bold text-primary px-1">{t('adminUpload.newCount', { count: newIndices.length })}</span>
            {newIndices.slice(0, 10).map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onScrollToReviewQuestion(idx)}
                className="w-6 h-6 rounded-md bg-primary text-primary-foreground font-bold text-xs hover:opacity-80 transition-opacity flex items-center justify-center cursor-pointer"
                title={t('adminUpload.jumpQuestion', { number: idx + 1 })}
                aria-label={t('adminUpload.jumpNewQuestion', { number: idx + 1 })}
              >
                {idx + 1}
              </button>
            ))}
            {newIndices.length > 10 && (
              <span className="text-[10px] text-muted-foreground px-1">
                {t('adminUpload.moreCount', { count: newIndices.length - 10 })}
              </span>
            )}
          </div>
        )}

        {reusedIndices.length > 0 && (
          <div className="flex items-center gap-1 bg-success-bg border border-success-border rounded-lg p-1.5 flex-wrap">
            <span className="font-bold text-success-fg px-1">{t('adminUpload.inBankCount', { count: reusedIndices.length })}</span>
            {reusedIndices.slice(0, 10).map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onScrollToReviewQuestion(idx)}
                className="w-6 h-6 rounded-md bg-success-bg text-success-fg border border-success-border font-bold text-xs hover:opacity-80 transition-opacity flex items-center justify-center cursor-pointer"
                title={t('adminUpload.jumpQuestion', { number: idx + 1 })}
                aria-label={t('adminUpload.jumpBankQuestion', { number: idx + 1 })}
              >
                {idx + 1}
              </button>
            ))}
            {reusedIndices.length > 10 && (
              <span className="text-[10px] text-muted-foreground px-1">
                {t('adminUpload.moreCount', { count: reusedIndices.length - 10 })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
