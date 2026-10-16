import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VariantCard } from './VariantCard'
import type { Conflict } from '@/hooks/question-bank/useQuestionBankConflicts'

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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Details &amp; Resolution</CardTitle>
      </CardHeader>
      <CardContent>
        {selectedConflict ? (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Question:</p>
              <p className="font-medium text-card-foreground">{selectedConflict.text}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">Select Correct Answer:</p>
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
                Update correct answer across all quizzes containing this question
              </label>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              <Button onClick={onResolve} disabled={resolving} className="flex-1">
                {resolving ? 'Saving...' : 'Save Answer'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Select a conflict to view details
          </div>
        )}
      </CardContent>
    </Card>
  )
}
