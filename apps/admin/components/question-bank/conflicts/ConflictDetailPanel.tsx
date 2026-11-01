'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VariantCard } from './VariantCard'
import type { Conflict } from '@/hooks/question-bank/useQuestionBankConflicts'
import { useTranslations } from '@fquiz/ui/i18n'

interface ConflictDetailPanelProps {
  selectedConflict: Conflict | null
  selectedVariantIndex: number
  setSelectedVariantIndex: (idx: number) => void
  updateAllQuizzes: boolean
  setUpdateAllQuizzes: (val: boolean) => void
  resolving: boolean
  onCancel: () => void
  onResolve: () => void
}

export function ConflictDetailPanel({
  selectedConflict,
  selectedVariantIndex,
  setSelectedVariantIndex,
  updateAllQuizzes,
  setUpdateAllQuizzes,
  resolving,
  onCancel,
  onResolve,
}: ConflictDetailPanelProps) {
  const t = useTranslations()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('adminConflict.detailsResolution')}</CardTitle>
      </CardHeader>
      <CardContent>
        {selectedConflict ? (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">{t('adminConflict.question')}</p>
              <p className="font-medium text-card-foreground">{selectedConflict.text}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">{t('adminConflict.selectCorrectAnswer')}</p>
              <div className="space-y-3">
                {selectedConflict.answer_groups.map((group, idx) => (
                  <VariantCard
                    key={idx}
                    group={group}
                    selected={selectedVariantIndex === idx}
                    onClick={() => setSelectedVariantIndex(idx)}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-warning-bg border border-warning-border text-warning-fg rounded-lg">
              <input
                type="checkbox"
                id="update-all"
                checked={updateAllQuizzes}
                onChange={(e) => setUpdateAllQuizzes(e.target.checked)}
                className="rounded border-warning-border"
              />
              <label
                htmlFor="update-all"
                className="text-sm font-medium cursor-pointer text-warning-fg"
              >
                {t('adminConflict.updateAllQuizzes')}
              </label>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button onClick={onResolve} disabled={resolving} className="flex-1">
                {resolving ? t('common.saving') : t('adminConflict.saveAnswer')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {t('adminConflict.selectConflict')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
