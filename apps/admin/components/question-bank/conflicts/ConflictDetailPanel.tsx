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
        <CardTitle>Chi tiết &amp; Giải quyết</CardTitle>
      </CardHeader>
      <CardContent>
        {selectedConflict ? (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Câu hỏi:</p>
              <p className="font-medium text-card-foreground">{selectedConflict.text}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">Chọn đáp án đúng:</p>
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
                Cập nhật đáp án đúng cho tất cả quiz có câu hỏi này
              </label>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Hủy
              </Button>
              <Button onClick={onResolve} disabled={resolving} className="flex-1">
                {resolving ? 'Đang lưu...' : 'Lưu đáp án'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Chọn một conflict để xem chi tiết
          </div>
        )}
      </CardContent>
    </Card>
  )
}
