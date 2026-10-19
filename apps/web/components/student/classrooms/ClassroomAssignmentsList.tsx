'use client'

import React from 'react'
import Link from 'next/link'
import { Card } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { BookOpen, Clock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import type { Classroom, Assignment } from '@/hooks/useStudentClassrooms'

interface ClassroomAssignmentsListProps {
  assignments: Assignment[]
  selectedClassroom: Classroom | null
}

export function ClassroomAssignmentsList({
  assignments,
  selectedClassroom,
}: ClassroomAssignmentsListProps) {
  const completedAssignmentsCount = assignments.filter((a) => a.my_progress?.status === 'completed').length
  const pendingAssignmentsCount = assignments.length - completedAssignmentsCount

  return (
    <div className="lg:col-span-2 space-y-3.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black uppercase tracking-wider text-card-foreground flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          Assignments: <span className="text-primary font-bold">{selectedClassroom?.name ?? 'All'}</span> ({assignments.length})
        </h2>
        {assignments.length > 0 && (
          <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-3">
            <span>
              Submitted: <strong className="text-emerald-600">{completedAssignmentsCount}</strong>
            </span>
            <span>
              Pending: <strong className="text-amber-600">{pendingAssignmentsCount}</strong>
            </span>
          </div>
        )}
      </div>

      {assignments.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-border rounded-3xl bg-card/70 backdrop-blur-md p-8 text-muted-foreground font-semibold text-xs">
          No assignments have been assigned in this classroom yet.
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a: Assignment) => {
            const isCompleted = a.my_progress?.status === 'completed'
            const isPastDue = a.due_at && new Date(a.due_at) < new Date()

            return (
              <Card
                key={a._id}
                className="border border-border bg-card rounded-2xl p-5 hover:border-primary/40 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isCompleted ? (
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Submitted ({a.my_progress?.best_score}% score)
                      </span>
                    ) : isPastDue ? (
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Overdue
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    )}
                    {a.quiz?.title && (
                      <span className="text-xs text-muted-foreground font-medium">
                        Quiz: <strong className="text-card-foreground">{a.quiz.title}</strong>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-extrabold text-card-foreground">{a.title}</h3>

                  <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
                    {a.due_at ? (
                      <span>
                        Due: <strong className={isPastDue ? 'text-rose-600' : 'text-card-foreground'}>{new Date(a.due_at).toLocaleDateString('en-US')}</strong>
                      </span>
                    ) : (
                      <span>No due date</span>
                    )}
                    {a.my_progress?.best_score !== undefined ? (
                      <span>
                        Best Score: <strong>{a.my_progress.best_score}%</strong>
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="shrink-0">
                  <Link href={`/quiz/${a.quiz_id}`}>
                    <Button
                      className={`font-black text-xs uppercase tracking-wider rounded-xl h-10 px-5 gap-1.5 cursor-pointer shadow-2xs ${
                        isCompleted
                          ? 'bg-muted hover:bg-muted/80 text-foreground border border-border'
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      }`}
                    >
                      <span>{isCompleted ? 'Retake Quiz' : 'Start Quiz'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
