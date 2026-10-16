'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/shared/ui/dialog'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { AlertCircle, Check } from 'lucide-react'
import { QuizItem, Classroom } from '@/hooks/useTeacherQuizzes'

interface TeacherAssignQuizModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedQuiz: QuizItem | null
  classrooms: Classroom[]
  selectedClassroomId: string
  onSelectClassroom: (id: string) => void
  dueDate: string
  onDueDateChange: (date: string) => void
  onSubmit: (e: React.FormEvent) => void
  assigning: boolean
  assignSuccess: string
  assignError: string
}

export function TeacherAssignQuizModal({
  open,
  onOpenChange,
  selectedQuiz,
  classrooms,
  selectedClassroomId,
  onSelectClassroom,
  dueDate,
  onDueDateChange,
  onSubmit,
  assigning,
  assignSuccess,
  assignError,
}: TeacherAssignQuizModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-card-foreground">Assign Quiz to Classroom</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {selectedQuiz && `Quiz: ${selectedQuiz.title} (${selectedQuiz.course_code})`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          {assignError && (
            <div className="p-3 bg-incorrect-bg text-destructive text-sm rounded-xl border border-incorrect-border flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <span>{assignError}</span>
            </div>
          )}
          {assignSuccess && (
            <div className="p-3 bg-success-bg text-success-fg text-sm rounded-xl border border-success-border flex items-center gap-2">
              <Check className="w-4 h-4 text-success-fg shrink-0" />
              <span>{assignSuccess}</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-card-foreground">Select Classroom (*)</label>
            {classrooms.length === 0 ? (
              <div className="text-xs text-warning-fg bg-warning-bg p-3 rounded-xl border border-warning-border">
                You do not have any classrooms. Please create a classroom before assigning quizzes.
              </div>
            ) : (
              <select
                value={selectedClassroomId}
                onChange={(e) => onSelectClassroom(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-card text-card-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {classrooms.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} (Code: {c.code})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-card-foreground">Due Date (Optional)</label>
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => onDueDateChange(e.target.value)}
              className="rounded-xl border-border bg-card text-card-foreground"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl border-border">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={assigning || classrooms.length === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl cursor-pointer"
            >
              {assigning ? 'Assigning...' : 'Confirm Assignment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
