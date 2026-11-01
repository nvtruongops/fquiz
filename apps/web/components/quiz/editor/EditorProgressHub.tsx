'use client'

import React from 'react'
import { Card } from '@/components/shared/ui/card'
import { Progress } from '@/components/shared/ui/progress'
import { Badge } from '@/components/shared/ui/badge'
import { ScrollArea } from '@/components/shared/ui/scroll-area'
import { LayoutDashboard, Loader2, CheckCircle2, AlertTriangle, AlertCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'

import { analyzeQuestionStructure } from '@/lib/modules/quiz/quiz-import/analyzer'
import { useLocale, useTranslations } from '@fquiz/ui/i18n'

interface DiagnosticError {
  code: string
  severity: 'error' | 'warning'
  message: string
  questionIndex?: number
}

interface EditorProgressHubProps {
  diagnostics: {
    total: number
    complete: number
    percent: number
    isValid: boolean
    errors: DiagnosticError[]
  }
  questions?: Array<{ options: string[]; correct_answers?: number[]; correct_answer?: number[] | number }>
  autosaving: boolean
  lastSavedAt: Date | null
  onScrollToQuestion: (idx: number) => void
}

function getDiagnosticText(t: ReturnType<typeof useTranslations>, error: DiagnosticError) {
  switch (error.code) {
    case 'MISSING_CATEGORY': return t('diagnostic.categoryRequired')
    case 'MISSING_COURSE_CODE': return t('diagnostic.courseCodeRequired')
    case 'INVALID_COURSE_CODE': return error.message.toLowerCase().includes('long')
      ? t('diagnostic.courseCodeTooLong')
      : t('diagnostic.courseCodeInvalid')
    case 'MISSING_TEXT': return t('diagnostic.questionTextRequired')
    case 'EMPTY_OPTION': return t('diagnostic.optionGap')
    case 'NO_CORRECT_ANSWER': return t('diagnostic.correctAnswerRequired')
    case 'TARGET_MISMATCH': {
      const match = error.message.match(/\((\d+)\/(\d+)\)/)
      if (!match) return t('diagnostic.targetUnder', { actual: 0, target: 0 })
      return error.severity === 'warning'
        ? t('diagnostic.targetOver', { actual: Number(match[1]), target: Number(match[2]) })
        : t('diagnostic.targetUnder', { actual: Number(match[1]), target: Number(match[2]) })
    }
    default: return t('quizImport.previewFailed')
  }
}

export function EditorProgressHub({
  diagnostics,
  questions,
  autosaving,
  lastSavedAt,
  onScrollToQuestion
}: EditorProgressHubProps) {
  const { locale } = useLocale()
  const t = useTranslations()
  const structureReport = React.useMemo(() => {
    if (!questions || questions.length === 0) return null
    const mapped = questions.map((q) => ({
      options: q.options || [],
      correct_answer: q.correct_answers ?? q.correct_answer ?? [],
    }))
    return analyzeQuestionStructure(mapped)
  }, [questions])

  return (
    <Card className="bg-card border border-border shadow-xs rounded-[24px] overflow-hidden">
      <div className="p-3.5 px-4 bg-muted/60 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-primary" />
          <span className="text-xs font-black text-foreground uppercase tracking-tight">{t('editorProgress.dashboard')}</span>
        </div>
        <div className="flex items-center gap-2">
          {autosaving ? (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t('editorProgress.saving')}
            </div>
          ) : lastSavedAt && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              {t('editorProgress.savedAt', { time: lastSavedAt.toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-US') })}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 space-y-3.5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground">{t('editorProgress.completion')}</span>
            <span className="font-black text-primary">
              {diagnostics.percent}%
            </span>
          </div>
          <Progress value={diagnostics.percent} className="h-1.5 bg-muted" />
          <p className="text-[10px] text-muted-foreground text-center font-medium">
            {t('editorProgress.validQuestions', { complete: diagnostics.complete, total: diagnostics.total })}
          </p>
        </div>

        {structureReport && structureReport.total > 0 && (
          <div className="p-2.5 bg-muted/40 border border-border rounded-xl space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>{t('editorProgress.fileStructure')}</span>
              <span className="text-foreground">{t('editorProgress.standardCount', { count: `${structureReport.standardCount}/${structureReport.total}` })}</span>
            </div>
            <div className="flex flex-wrap gap-1 text-[10px]">
              <Badge variant="outline" className="px-1.5 py-0 bg-success-bg/40 text-success-fg border-success-border/60">
                {t('editorProgress.singleAnswer', { count: structureReport.singleCorrectCount })}
              </Badge>
              {structureReport.multiCorrectCount > 0 && (
                <Badge variant="outline" className="px-1.5 py-0 bg-warning-bg text-warning-fg border-warning-border">
                  {t('editorProgress.multiAnswer', { count: structureReport.multiCorrectCount })}
                </Badge>
              )}
              {structureReport.fourOptionsCount === structureReport.total ? (
                <Badge variant="outline" className="px-1.5 py-0 bg-success-bg/40 text-success-fg border-success-border/60">
                  {t('editorProgress.fourOptions')}
                </Badge>
              ) : (
                <Badge variant="outline" className="px-1.5 py-0 bg-warning-bg text-warning-fg border-warning-border">
                  {t('editorProgress.nonFourOptions', { count: structureReport.lessThanFourOptionsCount + structureReport.moreThanFourOptionsCount })}
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t('editorProgress.qualityStatus')}</span>
            <Badge variant="outline" className={cn(
              "text-[10px] uppercase font-bold px-2 py-0.5 rounded-md",
              diagnostics.isValid ? "bg-success-bg text-success-fg border-success-border" : "bg-warning-bg text-warning-fg border-warning-border"
            )}>
              {diagnostics.isValid ? t('editorProgress.readyPublish') : t('editorProgress.needsAttention')}
            </Badge>
          </div>

          {diagnostics.errors.length === 0 ? (
            <div className="py-2 px-3 bg-success-bg/40 border border-success-border/60 rounded-lg flex items-center gap-2 text-success-fg">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-success-fg" />
              <span className="text-[11px] font-medium">{t('editorProgress.noErrors')}</span>
            </div>
          ) : (
            <ScrollArea className="max-h-[140px] pr-2">
              <div className="space-y-1.5">
                {diagnostics.errors.map((err, i) => (
                  <button
                    key={i}
                    onClick={() => typeof err.questionIndex === 'number' && onScrollToQuestion(err.questionIndex)}
                    className={cn(
                      "w-full text-left p-2 rounded-lg border transition-all hover:scale-[1.01] active:scale-95 group cursor-pointer",
                      err.severity === 'error' ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-warning-bg border-warning-border text-warning-fg"
                    )}
                  >
                    <div className="flex gap-2">
                      {err.severity === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-black uppercase tracking-wider">
                            {typeof err.questionIndex === 'number' ? t('editorProgress.question', { number: err.questionIndex + 1 }) : t('editorProgress.global')}
                          </span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] font-medium leading-tight">{getDiagnosticText(t, err)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </Card>
  )
}
