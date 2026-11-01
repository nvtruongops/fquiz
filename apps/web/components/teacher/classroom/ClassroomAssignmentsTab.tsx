'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { BookOpen, Plus, FileSpreadsheet } from 'lucide-react'
import type { Assignment } from '@/hooks/teacher/useTeacherClassroomDetail'
import { useLocale, useTranslations } from '@fquiz/ui/i18n'

interface ClassroomAssignmentsTabProps {
  assignments: Assignment[]
  onOpenAssignModal: () => void
  onViewReport: (assignmentId: string) => void
}

export function ClassroomAssignmentsTab({
  assignments,
  onOpenAssignModal,
  onViewReport,
}: ClassroomAssignmentsTabProps) {
  const t = useTranslations()
  const { locale } = useLocale()
  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-card-foreground">{t('classroom.assignedQuizzes')}</h2>
        <Button
          onClick={onOpenAssignModal}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> {t('classroom.assignQuizToClass')}
        </Button>
      </div>

      {assignments.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-border rounded-3xl bg-card p-8 space-y-4">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-card-foreground">{t('classroom.noAssignmentsYet')}</h3>
          <p className="text-sm font-medium text-muted-foreground max-w-md mx-auto leading-relaxed">
            {t('classroom.assignFirstQuizDescription')}
          </p>
          <Button
            onClick={onOpenAssignModal}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-6 cursor-pointer"
          >
            {t('classroom.assignFirstQuiz')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((a) => (
            <Card
              key={a._id}
              className="border border-border shadow-xs hover:shadow-md transition-all rounded-2xl bg-card overflow-hidden flex flex-col justify-between"
            >
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-lg font-bold text-card-foreground">{a.title}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1 font-medium">
                  {t('classroom.quizLabel')} <span className="font-bold text-card-foreground">{a.quiz?.title || t('classroom.quiz')}</span> ({t('classroom.questionCount', { count: a.quiz?.questionCount ?? 0 })})
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 flex items-center justify-between border-t border-border mt-3 pt-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  {a.due_at ? (
                    <span>
                      {t('classroom.due', { date: new Date(a.due_at).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US') })}
                    </span>
                  ) : (
                    <span>{t('classroom.noDueDate')}</span>
                  )}
                </div>
                <Button
                  onClick={() => onViewReport(a._id)}
                  variant="outline"
                  size="sm"
                  className="text-primary border-primary/30 hover:bg-primary/10 font-bold rounded-xl gap-1.5 text-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> {t('classroom.viewGradeReport')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
