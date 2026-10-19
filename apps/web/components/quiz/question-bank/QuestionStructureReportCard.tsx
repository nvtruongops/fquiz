'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Badge } from '@/components/shared/ui/badge'
import { Button } from '@/components/shared/ui/button'
import { FileText, CheckCircle2, AlertTriangle, AlertCircle, ChevronDown, ChevronUp, HelpCircle, X, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import type { QuestionStructureReport } from '@/lib/modules/quiz/quiz-import/types'

interface Props {
  report: QuestionStructureReport
  importSummary?: {
    totalQuestions: number
    validQuestions: number
    errors: number
    warnings: number
    isValid: boolean
  }
  bankStatus?: {
    sameAnswerCount: number
    differentAnswerCount: number
  }
  diagnostics?: Array<{
    level?: 'error' | 'warning'
    code?: string
    message: string
    questionIndex?: number
  }>
  onSelectQuestion?: (index: number) => void
  onReanalyze?: () => void
  onClose?: () => void
  className?: string
}

export function QuestionStructureReportCard({ report, importSummary, bankStatus, diagnostics, onSelectQuestion, onReanalyze, onClose, className }: Readonly<Props>) {
  const [showNonStandardList, setShowNonStandardList] = React.useState(false)

  const multiAnswerBreakdownText = Object.entries(report.multiCorrectBreakdown)
    .map(([count, num]) => `${num} with ${count} correct answers`)
    .join(', ')

  const lessOptionsBreakdownText = Object.entries(report.lessThanFourBreakdown)
    .map(([count, num]) => `${num} with ${count} options`)
    .join(', ')

  const moreOptionsBreakdownText = Object.entries(report.moreThanFourBreakdown)
    .map(([count, num]) => `${num} with ${count} options`)
    .join(', ')

  return (
    <Card className={cn("bg-card border border-border shadow-xs rounded-2xl overflow-hidden", className)}>
      <CardHeader className="p-4 bg-muted/50 border-b border-border flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <CardTitle className="text-xs font-black uppercase tracking-wider text-foreground">
            File Structure & Question Bank Analysis Report
          </CardTitle>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onReanalyze && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReanalyze}
              className="h-7 px-2.5 text-[11px] font-bold border-primary/40 text-primary hover:bg-primary/10 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Update report</span>
            </Button>
          )}
          <Badge variant="outline" className="text-[10px] font-bold border-primary/30 text-primary bg-primary/10">
            Reference only
          </Badge>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Import Summary & Question Bank Status Banners */}
        {importSummary && (
          <div className="flex items-center gap-2 flex-wrap pb-3 border-b border-border text-xs">
            <Badge variant="outline" className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded-md", importSummary.isValid ? "bg-success-bg text-success-fg border-success-border" : "bg-warning-bg text-warning-fg border-warning-border")}>
              {importSummary.isValid ? 'Valid' : 'Errors found'}
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">
              Total: {importSummary.totalQuestions} | Valid: {importSummary.validQuestions} | Errors: {importSummary.errors} | Warnings: {importSummary.warnings}
            </span>
          </div>
        )}

        {bankStatus && bankStatus.sameAnswerCount > 0 && (
          <div className="p-3 bg-success-bg/30 border border-success-border/60 rounded-xl space-y-1 text-xs text-success-fg">
            <div className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-success-fg" />
              <span>✓ {bankStatus.sameAnswerCount} questions already in question bank</span>
            </div>
            <p className="text-[11px] text-success-fg/90 pl-5 leading-relaxed">
              These questions already exist with matching answers. Safe to reuse.
            </p>
          </div>
        )}

        {bankStatus && bankStatus.differentAnswerCount > 0 && (
          <div className="p-3 bg-incorrect-bg/40 border border-incorrect-border/60 rounded-xl space-y-1 text-xs text-destructive">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-destructive" />
              <span>⚠️ {bankStatus.differentAnswerCount} questions have conflicting answers with the question bank</span>
            </div>
          </div>
        )}

        {/* Diagnostics Warnings List */}
        {diagnostics && diagnostics.length > 0 && (
          <div className="p-3 bg-warning-bg/30 border border-warning-border/60 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-warning-fg">
              <AlertCircle className="w-4 h-4 shrink-0 text-warning-fg" />
              <span>File Notes & Warnings ({diagnostics.length})</span>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {diagnostics.map((item, idx) => (
                <div key={`${item.code}-${idx}`} className="flex items-start justify-between gap-2 text-warning-fg/90 bg-card/60 p-2 rounded-lg border border-warning-border/40">
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold shrink-0">
                      {item.questionIndex !== undefined ? `Question ${item.questionIndex + 1}:` : '•'}
                    </span>
                    <span className="leading-snug">{item.message}</span>
                  </div>
                  {item.questionIndex !== undefined && onSelectQuestion && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectQuestion(item.questionIndex!)}
                      className="h-6 px-2 text-[10px] font-bold text-primary hover:text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
                    >
                      View question
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Helper Banner */}
        <div className="p-2.5 bg-info-bg/40 border border-info-border/60 rounded-xl flex items-start gap-2 text-info-fg text-xs">
          <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            Report lists option count and correct answer count in the file. <strong>You can still create quizzes normally with all of these questions.</strong>
          </span>
        </div>

        {/* Overview Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Total Questions */}
          <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Total Questions</span>
            <span className="text-lg font-black text-foreground">{report.total}</span>
            <span className="text-[10px] text-muted-foreground block">questions in file</span>
          </div>

          {/* Standard Count */}
          <div className="p-3 bg-success-bg/30 rounded-xl border border-success-border/50 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-success-fg block">Standard (4 opts + 1 ans)</span>
            <span className="text-lg font-black text-success-fg">{report.standardCount}</span>
            <span className="text-[10px] text-success-fg/80 block">{Math.round((report.standardCount / (report.total || 1)) * 100)}% of total questions</span>
          </div>

          {/* Correct Answers Stat */}
          <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Correct Answers</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-foreground">{report.singleCorrectCount} single-answer</span>
            </div>
            {report.multiCorrectCount > 0 ? (
              <span className="text-[10px] font-medium text-warning-fg block">
                ⚠️ {report.multiCorrectCount} questions &gt; 1 answer {multiAnswerBreakdownText ? `(${multiAnswerBreakdownText})` : ''}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground block">100% single-answer</span>
            )}
          </div>

          {/* Option Counts Stat */}
          <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Options Count</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-foreground">{report.fourOptionsCount} 4-option</span>
            </div>
            {(report.lessThanFourOptionsCount > 0 || report.moreThanFourOptionsCount > 0) ? (
              <span className="text-[10px] font-medium text-warning-fg block">
                ⚠️ {report.lessThanFourOptionsCount + report.moreThanFourOptionsCount} non-4-option questions
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground block">100% 4-option</span>
            )}
          </div>
        </div>

        {/* Detailed Breakdown Tags */}
        <div className="p-3 bg-card border border-border rounded-xl space-y-2">
          <span className="text-xs font-bold text-foreground block">Question structure distribution details:</span>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <Badge variant="outline" className="bg-success-bg/40 text-success-fg border-success-border/60">
              ✓ 1 Correct answer: {report.singleCorrectCount} questions
            </Badge>
            {report.multiCorrectCount > 0 && (
              <Badge variant="outline" className="bg-warning-bg text-warning-fg border-warning-border font-medium">
                ⚠️ &gt; 1 Correct answer: {report.multiCorrectCount} questions ({multiAnswerBreakdownText})
              </Badge>
            )}
            {report.zeroCorrectCount > 0 && (
              <Badge variant="outline" className="bg-incorrect-bg text-destructive border-incorrect-border">
                ❌ No correct answer: {report.zeroCorrectCount} questions
              </Badge>
            )}

            <Badge variant="outline" className="bg-success-bg/40 text-success-fg border-success-border/60">
              ✓ Exactly 4 options: {report.fourOptionsCount} questions
            </Badge>
            {report.lessThanFourOptionsCount > 0 && (
              <Badge variant="outline" className="bg-warning-bg text-warning-fg border-warning-border font-medium">
                ⚠️ 2-3 options: {report.lessThanFourOptionsCount} questions ({lessOptionsBreakdownText})
              </Badge>
            )}
            {report.moreThanFourOptionsCount > 0 && (
              <Badge variant="outline" className="bg-warning-bg text-warning-fg border-warning-border font-medium">
                ⚠️ &gt; 4 options: {report.moreThanFourOptionsCount} questions ({moreOptionsBreakdownText})
              </Badge>
            )}
          </div>
        </div>

        {/* Non-standard Questions List Accordion */}
        {report.nonStandardCount > 0 && (
          <div className="space-y-2 pt-1 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNonStandardList(!showNonStandardList)}
              className="w-full justify-between h-9 text-xs font-bold rounded-xl border-border text-foreground hover:bg-muted"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-warning-fg" />
                <span>List of {report.nonStandardCount} non-standard questions (4 options + 1 answer)</span>
              </div>
              {showNonStandardList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            {showNonStandardList && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {report.nonStandardQuestions.map((q) => (
                  <div
                    key={q.questionIndex}
                    onClick={() => onSelectQuestion?.(q.questionIndex)}
                    className={cn(
                      "p-2 rounded-lg border text-xs flex items-center justify-between transition-all",
                      onSelectQuestion ? "hover:bg-muted cursor-pointer" : "",
                      "bg-warning-bg/30 border-warning-border/50 text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">Question {q.questionIndex + 1}:</span>
                      <span className="text-muted-foreground">{q.reasons.join(' | ')}</span>
                    </div>
                    {onSelectQuestion && (
                      <span className="text-[10px] text-primary font-bold hover:underline shrink-0">View question</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
