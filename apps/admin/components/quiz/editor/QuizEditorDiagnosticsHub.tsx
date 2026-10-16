import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  Database,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import type { QuestionItem, QuizDiagnostics } from '@/hooks/quiz/types'

interface QuizEditorDiagnosticsHubProps {
  diagnostics: QuizDiagnostics
  questions: QuestionItem[]
  isCheckingBank: boolean
  bankStatus: {
    checked: boolean
    hasConflicts: boolean
    conflicts: any[]
  }
  onScrollToQuestion: (index: number) => void
}

export function QuizEditorDiagnosticsHub({
  diagnostics,
  questions,
  isCheckingBank,
  bankStatus,
  onScrollToQuestion,
}: QuizEditorDiagnosticsHubProps) {
  return (
    <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6 z-20">
      <Card className="border-border bg-card shadow-md">
        <CardHeader className="p-4 pb-3 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-primary" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Completion Progress
            </CardTitle>
          </div>
          <Badge
            variant={diagnostics.isValid ? 'success' : 'outline'}
            className="text-[10px] font-bold"
          >
            {diagnostics.percent}%
          </Badge>
        </CardHeader>

        <CardContent className="p-4 space-y-4 max-h-[calc(100vh-9rem)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Validity</span>
              <span className="font-bold text-foreground">
                {diagnostics.completed} / {diagnostics.total} {diagnostics.total === 1 ? 'question' : 'questions'}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  diagnostics.percent === 100 ? 'bg-success-fg' : 'bg-primary'
                }`}
                style={{ width: `${diagnostics.percent}%` }}
              />
            </div>
          </div>

          {/* Question Bank Status */}
          <div className="p-3 rounded-xl border border-border/80 bg-muted/30 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 text-foreground">
                <Database className="w-3.5 h-3.5 text-primary" />
                Question Bank
              </span>
              {isCheckingBank ? (
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
              ) : bankStatus.hasConflicts ? (
                <span className="text-destructive font-bold">Conflicts</span>
              ) : (
                <span className="text-success-fg font-bold">Checked</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isCheckingBank
                ? 'Checking for duplicates...'
                : bankStatus.hasConflicts
                ? `${bankStatus.conflicts.length} question(s) have answer conflicts with the bank.`
                : 'All questions ready for synchronization.'}
            </p>
          </div>

          {/* Issue List / Warnings */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Diagnostics &amp; Issues ({diagnostics.errors.length})
            </span>

            {diagnostics.errors.length === 0 ? (
              <div className="p-3 bg-success-bg/40 border border-success-border/60 rounded-xl flex items-center gap-2 text-success-fg text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Quiz is 100% complete and valid!</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {diagnostics.errors.slice(0, 8).map((err, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => typeof err.questionIndex === 'number' && onScrollToQuestion(err.questionIndex)}
                    className="w-full text-left p-2.5 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs hover:bg-destructive/15 transition-colors flex items-start gap-2 cursor-pointer group"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold flex items-center justify-between">
                        <span>
                          {typeof err.questionIndex === 'number' ? `Question ${err.questionIndex + 1}` : 'General'}
                        </span>
                        {typeof err.questionIndex === 'number' && (
                          <ChevronRight className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                        )}
                      </div>
                      <p className="text-[11px] font-medium leading-tight opacity-90">{err.message}</p>
                    </div>
                  </button>
                ))}
                {diagnostics.errors.length > 8 && (
                  <p className="text-[10px] text-muted-foreground text-center pt-1 font-medium">
                    and {diagnostics.errors.length - 8} more issues...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Quick Question Number Navigator */}
          <div className="space-y-1.5 pt-2 border-t border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Quick Navigation ({questions.length} {questions.length === 1 ? 'question' : 'questions'})
            </span>
            <div className="max-h-56 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((q, idx) => {
                  const isValid = q.text.trim() && q.options.filter((o) => o.trim()).length >= 2
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onScrollToQuestion(idx)}
                      className={`h-7 rounded text-xs font-mono font-bold transition-all cursor-pointer border ${
                        isValid
                          ? 'bg-muted/40 hover:bg-muted text-foreground border-border'
                          : 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20'
                      }`}
                      title={`Jump to question ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
