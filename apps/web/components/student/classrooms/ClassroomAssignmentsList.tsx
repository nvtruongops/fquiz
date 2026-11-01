'use client'

import React from 'react'
import Link from 'next/link'
import { Card } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { BookOpen, Clock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import type { Classroom, Assignment } from '@/hooks/useStudentClassrooms'
import { useLocale, useTranslations } from '@fquiz/ui/i18n'

interface ClassroomAssignmentsListProps {
  assignments: Assignment[]
  selectedClassroom: Classroom | null
  loading: boolean
  error: string
  onRetry: () => void
}

function AssignmentStatusBadge({ assignment, isPastDue }: { assignment: Assignment; isPastDue: boolean }) {
  const t = useTranslations()
  if (assignment.my_progress?.status === 'completed') {
    return (
      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" /> {t('classroom.submittedScore', { score: assignment.my_progress.best_score })}
      </span>
    )
  }

  if (isPastDue) {
    return (
      <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> {t('classroom.overdue')}
      </span>
    )
  }

  return (
    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
      <Clock className="w-3 h-3" /> {t('classroom.pending')}
    </span>
  )
}

function AssignmentQuizTitle({ title }: { title?: string }) {
  const t = useTranslations()
  if (!title) return null
  return <span className="text-xs text-muted-foreground font-medium">{t('classroom.quizPrefix', { title })}</span>
}

function AssignmentDueDate({ dueAt, isPastDue }: { dueAt?: string | Date; isPastDue: boolean }) {
  const t = useTranslations()
  const { locale } = useLocale()
  if (!dueAt) return <span>{t('classroom.noDueDate')}</span>
  return <span>{t('classroom.due', { date: new Date(dueAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US') })}</span>
}

function AssignmentBestScore({ score }: { score?: number }) {
  const t = useTranslations()
  if (score === undefined) return null
  return <span>{t('classroom.bestScore', { score })}</span>
}

function AssignmentDetails({ assignment, isPastDue }: { assignment: Assignment; isPastDue: boolean }) {
  const t = useTranslations()
  return (
    <div className="space-y-1.5 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <AssignmentStatusBadge assignment={assignment} isPastDue={isPastDue} />
        <AssignmentQuizTitle title={assignment.quiz?.title} />
      </div>

      <h3 className="text-base font-extrabold text-card-foreground">
        {assignment.title === 'Archived assignment' ? t('classroom.archivedAssignment') : assignment.title}
      </h3>

      <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
        <AssignmentDueDate dueAt={assignment.due_at} isPastDue={isPastDue} />
        <AssignmentBestScore score={assignment.my_progress?.best_score} />
      </div>
    </div>
  )
}

function AssignmentAction({ assignment }: { assignment: Assignment }) {
  const t = useTranslations()
  const isCompleted = assignment.my_progress?.status === 'completed'
  return (
    <Link href={`/quiz/${assignment.quiz_id}`}>
      <Button
        className={`font-black text-xs uppercase tracking-wider rounded-xl h-10 px-5 gap-1.5 cursor-pointer shadow-2xs ${
          isCompleted
            ? 'bg-muted hover:bg-muted/80 text-foreground border border-border'
            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
        }`}
      >
        <span>{isCompleted ? t('classroom.retakeQuiz') : t('classroom.startQuiz')}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </Link>
  )
}

function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const isPastDue = Boolean(assignment.due_at && new Date(assignment.due_at) < new Date())
  return (
    <Card className="border border-border bg-card rounded-2xl p-5 hover:border-primary/40 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
      <AssignmentDetails assignment={assignment} isPastDue={isPastDue} />
      <div className="shrink-0">
        <AssignmentAction assignment={assignment} />
      </div>
    </Card>
  )
}

function AssignmentListContent({ assignments, loading, error, onRetry }: Pick<ClassroomAssignmentsListProps, 'assignments' | 'loading' | 'error' | 'onRetry'>) {
  const t = useTranslations()
  if (error) {
    return (
      <div role="alert" className="py-10 text-center border border-destructive/20 rounded-2xl bg-destructive/10 p-8 space-y-3">
        <p className="text-sm font-bold text-destructive">{error}</p>
        <Button onClick={onRetry} variant="outline" size="sm" className="rounded-xl text-xs font-black">
          {t('classroom.tryAgain')}
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="py-16 text-center border border-border rounded-3xl bg-card/70 p-8 text-muted-foreground font-semibold text-xs">
        {t('classroom.loadingAssignments')}
      </div>
    )
  }

  if (assignments.length === 0) {
    return (
      <div className="py-16 text-center border-2 border-dashed border-border rounded-3xl bg-card/70 backdrop-blur-md p-8 text-muted-foreground font-semibold text-xs">
        {t('classroom.noAssignments')}
      </div>
    )
  }

  return <div className="space-y-3">{assignments.map((assignment) => <AssignmentCard key={assignment._id} assignment={assignment} />)}</div>
}

export function ClassroomAssignmentsList({
  assignments,
  selectedClassroom,
  loading,
  error,
  onRetry,
}: ClassroomAssignmentsListProps) {
  const t = useTranslations()
  const completedAssignmentsCount = assignments.filter((a) => a.my_progress?.status === 'completed').length
  const pendingAssignmentsCount = assignments.length - completedAssignmentsCount

  return (
    <div className="lg:col-span-2 space-y-3.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black uppercase tracking-wider text-card-foreground flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          {t('classroom.assignmentsFor', { classroom: selectedClassroom?.name ?? t('classroom.allClassrooms') })} ({assignments.length})
        </h2>
        {assignments.length > 0 && (
          <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-3">
            <span>
              {t('classroom.submitted', { count: completedAssignmentsCount })}
            </span>
            <span>
              {t('classroom.pendingCount', { count: pendingAssignmentsCount })}
            </span>
          </div>
        )}
      </div>

      <AssignmentListContent assignments={assignments} loading={loading} error={error} onRetry={onRetry} />
    </div>
  )
}
