'use client'

import React from 'react'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/shared/ui/dialog'
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import type { Member, StudentReport } from '@/hooks/teacher/useTeacherClassroomDetail'
import { useLocale, useTranslations } from '@fquiz/ui/i18n'

interface ClassroomModalsProps {
  assignModalOpen: boolean
  onSetAssignModalOpen: (open: boolean) => void
  myQuizzes: any[]
  selectedQuizId: string
  onSetSelectedQuizId: (id: string) => void
  assignmentTitle: string
  onSetAssignmentTitle: (title: string) => void
  dueAt: string
  onSetDueAt: (date: string) => void
  assigning: boolean
  errorMessage: string
  onAssignQuiz: (e: React.FormEvent) => void

  reportModalOpen: boolean
  onSetReportModalOpen: (open: boolean) => void
  selectedAssignmentReport: any | null
  loadingReport: boolean

  tagModalOpen: boolean
  onSetTagModalOpen: (open: boolean) => void
  selectedMemberForTag: Member | null
  tagInputText: string
  onSetTagInputText: (text: string) => void
  updatingTags: boolean
  onSaveTags: (e: React.FormEvent) => void
}

export function ClassroomModals({
  assignModalOpen,
  onSetAssignModalOpen,
  myQuizzes,
  selectedQuizId,
  onSetSelectedQuizId,
  assignmentTitle,
  onSetAssignmentTitle,
  dueAt,
  onSetDueAt,
  assigning,
  errorMessage,
  onAssignQuiz,

  reportModalOpen,
  onSetReportModalOpen,
  selectedAssignmentReport,
  loadingReport,

  tagModalOpen,
  onSetTagModalOpen,
  selectedMemberForTag,
  tagInputText,
  onSetTagInputText,
  updatingTags,
  onSaveTags,
}: ClassroomModalsProps) {
  const t = useTranslations()
  const { locale } = useLocale()
  return (
    <>
      {/* Modal 1: Assign Quiz Modal */}
      <Dialog open={assignModalOpen} onOpenChange={onSetAssignModalOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-card-foreground">
              {t('classroom.assignQuizTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t('classroom.assignQuizDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onAssignQuiz} className="space-y-4 py-2">
            {errorMessage && (
              <div className="p-3 bg-incorrect-bg text-destructive text-sm rounded-xl border border-incorrect-border flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">{t('classroom.selectQuiz')}</label>
              <select
                value={selectedQuizId}
                onChange={(e) => {
                  onSetSelectedQuizId(e.target.value)
                  const quiz = myQuizzes.find((q) => q._id === e.target.value)
                  if (quiz && !assignmentTitle) onSetAssignmentTitle(t('classroom.assignmentTitleFor', { title: quiz.title }))
                }}
                className="w-full h-10 px-3 border rounded-xl text-sm bg-card text-card-foreground border-border focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">{t('classroom.selectQuizOption')}</option>
                {myQuizzes.map((q) => (
                  <option key={q._id} value={q._id}>
                    {q.title} ({t('mix.questionCount', { count: q.questionCount || 0 })})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">{t('classroom.assignmentTitle')}</label>
              <Input
                placeholder={t('classroom.enterAssignmentTitle')}
                value={assignmentTitle}
                onChange={(e) => onSetAssignmentTitle(e.target.value)}
                required
                className="rounded-xl border-border bg-card text-card-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">{t('classroom.dueDateOptional')}</label>
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => onSetDueAt(e.target.value)}
                className="rounded-xl border-border bg-card text-card-foreground"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onSetAssignModalOpen(false)}
                className="rounded-xl border-border"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={assigning}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl cursor-pointer"
              >
                {assigning ? t('classroom.assigning') : t('classroom.assignQuiz')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Report Modal */}
      <Dialog open={reportModalOpen} onOpenChange={onSetReportModalOpen}>
        <DialogContent className="sm:max-w-3xl bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-card-foreground">
              {t('classroom.assignmentReport', { title: selectedAssignmentReport?.assignment?.title ?? '' })}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t('classroom.assignmentReportSummary', { total: selectedAssignmentReport?.total_students ?? 0, completed: selectedAssignmentReport?.completed_students ?? 0 })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingReport ? (
              <div className="py-8 text-center text-muted-foreground font-semibold">{t('classroom.loadingReport')}</div>
            ) : !selectedAssignmentReport ? (
              <div className="py-8 text-center text-muted-foreground font-semibold">{t('classroom.noData')}</div>
            ) : (
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-card-foreground font-bold border-b border-border">
                    <tr>
                      <th className="p-3">{t('classroom.student')}</th>
                      <th className="p-3">{t('classroom.status')}</th>
                      <th className="p-3 text-center">{t('classroom.bestScoreHeading')}</th>
                      <th className="p-3 text-center">{t('classroom.attempts')}</th>
                      <th className="p-3 text-right">{t('classroom.submittedDate')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-muted-foreground">
                    {selectedAssignmentReport.students.map((s: StudentReport) => (
                      <tr key={s.student_id}>
                        <td className="p-3 font-bold text-card-foreground">{s.username}</td>
                        <td className="p-3">
                          {s.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-success-bg text-success-fg border border-success-border">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {t('classroom.assignmentSubmitted')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-warning-bg text-warning-fg border border-warning-border">
                              <Clock className="w-3.5 h-3.5" /> {t('classroom.notStarted')}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center font-black text-primary">{s.best_score}%</td>
                        <td className="p-3 text-center font-semibold">{s.attempts_count}</td>
                        <td className="p-3 text-right text-xs text-muted-foreground">
                          {s.submitted_at ? new Date(s.submitted_at).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onSetReportModalOpen(false)}
              className="rounded-xl border-border"
            >
              {t('common.closeNotification')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Edit Student Tags Modal */}
      <Dialog open={tagModalOpen} onOpenChange={onSetTagModalOpen}>
        <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-card-foreground">{t('classroom.manageTags')}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t('classroom.studentWithName', { name: selectedMemberForTag?.student?.username || t('classroom.student') })} ({selectedMemberForTag?.student?.email})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSaveTags} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">
                {t('classroom.noteTags')}
              </label>
              <Input
                placeholder={t('classroom.tagPlaceholder')}
                value={tagInputText}
                onChange={(e) => onSetTagInputText(e.target.value)}
                className="rounded-xl border-border bg-card text-card-foreground"
              />
              <p className="text-[11px] font-medium text-muted-foreground">
                {t('classroom.tagExample')}
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onSetTagModalOpen(false)}
                className="rounded-xl border-border"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={updatingTags}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl cursor-pointer"
              >
                {updatingTags ? t('classroom.saving') : t('classroom.saveTags')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
