'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Key, ShieldCheck, Check, Copy } from 'lucide-react'
import type { ClassroomDetail } from '@/hooks/teacher/useTeacherClassroomDetail'
import { useTranslations } from '@fquiz/ui/i18n'

interface ClassroomDetailHeaderProps {
  classroom: ClassroomDetail
  copied: boolean
  onCopyCode: () => void
}

export function ClassroomDetailHeader({
  classroom,
  copied,
  onCopyCode,
}: ClassroomDetailHeaderProps) {
  const t = useTranslations()
  return (
    <div className="space-y-8">
      {/* Back Link */}
      <div>
        <Link
          href="/teacher/classrooms"
          className="text-sm font-bold text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {t('classroom.backToList')}
        </Link>
      </div>

      {/* Classroom Banner Card */}
      <div className="bg-card border border-border rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              {t('classroom.details')}
            </span>
            {classroom.password ? (
              <span className="text-[10px] font-bold text-warning-fg bg-warning-bg px-2.5 py-1 rounded-full border border-warning-border flex items-center gap-1">
                <Key className="w-3 h-3" /> {t('classroom.passwordProtected')}
              </span>
            ) : (
              <span className="text-[10px] font-bold text-success-fg bg-success-bg px-2.5 py-1 rounded-full border border-success-border flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> {t('classroom.publicAccess')}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black text-card-foreground">{classroom.name}</h1>
          {classroom.description && (
            <p className="text-muted-foreground text-sm font-medium">{classroom.description}</p>
          )}
        </div>

        <div className="flex items-center gap-4 bg-muted/60 p-3.5 rounded-2xl border border-border shrink-0">
          <div className="text-right text-xs">
            <div className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
              {t('classroom.size')}
            </div>
            <div className="font-black text-card-foreground text-base">
              {classroom.student_count} {t('classrooms.students')}
            </div>
          </div>

          <div className="h-8 w-px bg-border" />

          <div>
            <div className="text-muted-foreground font-bold uppercase tracking-wider text-[10px] mb-0.5">
              {t('classrooms.code')}
            </div>
            <button
              onClick={onCopyCode}
              className="inline-flex items-center gap-2 bg-card border border-primary/30 text-primary px-3.5 py-1.5 rounded-xl font-mono font-black text-base hover:bg-primary/10 transition-colors shadow-2xs cursor-pointer"
              title={t('classroom.copyCode')}
            >
              {copied ? <Check className="w-4 h-4 text-success-fg" /> : <Copy className="w-4 h-4 text-primary" />}
              {classroom.code}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
