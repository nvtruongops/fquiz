'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert } from 'lucide-react'

export interface ResolvedAnswer {
  questionIndex: number
  correct_answer: number[]
  options: string[]
}

interface QuestionConflictModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conflicts: any
  totalConflicts: number
  onResolve: (action: 'edit' | 'force', resolutions?: ResolvedAnswer[]) => void
}

export function QuestionConflictModal({
  open,
  onOpenChange,
  conflicts,
  totalConflicts,
  onResolve,
}: QuestionConflictModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border text-card-foreground">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive font-bold text-lg">
            <ShieldAlert className="w-5 h-5" />
            Answer Conflicts Detected ({totalConflicts} {totalConflicts === 1 ? 'question' : 'questions'})
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Some questions in this quiz already exist in the Question Bank but have different correct answers from your current selection.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[360px] overflow-y-auto space-y-3 pr-2 my-2">
          {Array.isArray(conflicts) &&
            conflicts.map((c: any, i: number) => (
              <div key={i} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2 text-xs">
                <div className="font-semibold text-foreground flex items-center justify-between">
                  <span>Question: {c.text || `Item ${i + 1}`}</span>
                  <Badge variant="destructive" className="text-[10px]">
                    Conflict
                  </Badge>
                </div>
                <div className="text-muted-foreground">
                  <p className="font-medium text-foreground">The Question Bank stores a different correct answer than your current selection.</p>
                </div>
              </div>
            ))}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => onResolve('edit')}
            className="cursor-pointer"
          >
            Back to Edit Questions
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => onResolve('force')}
            className="cursor-pointer font-bold"
          >
            Keep Current Quiz Answers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
