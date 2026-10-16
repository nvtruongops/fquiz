'use client'

import * as React from 'react'
import { AlertCircle } from 'lucide-react'
import type { BankCheckResult } from '@/hooks/quiz/useQuizImport'

interface QuizImportConflictResolverProps {
  bankCheck: BankCheckResult
  conflictChoice: Record<number, { source: 'current' | 'bank'; variantIdx: number }>
  onConflictChoiceChange: (
    questionIndex: number,
    choice: { source: 'current' | 'bank'; variantIdx: number }
  ) => void
}

export function QuizImportConflictResolver({
  bankCheck,
  conflictChoice,
  onConflictChoiceChange,
}: Readonly<QuizImportConflictResolverProps>) {
  if (bankCheck.different_answer_conflicts === 0) return null

  return (
    <div className="bg-incorrect-bg border border-incorrect-border rounded-lg p-4">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 text-xs">
          <p className="font-bold text-sm text-destructive mb-0.5">
            {bankCheck.different_answer_conflicts} questions have conflicting answers
          </p>
          <p className="text-destructive leading-relaxed mb-3">
            Identical question and options, but answers differ from the question bank.
            Select the correct answer and click <span className="font-semibold">&quot;Confirm Answer Choices&quot;</span> to synchronize.
          </p>

          <div className="space-y-3">
            {bankCheck.conflicts.different_answer.map((c) => {
              const q = c.question
              const importedLines = q
                ? c.question!.correct_answer.map(
                    (i) => `${String.fromCodePoint(65 + i)}. ${q.options[i] ?? ''}`
                  )
                : []
              const variants = c.existingQuestion
                ? [
                    {
                      correct_answer: c.existingQuestion.correct_answer,
                      options: c.existingQuestion.options ?? q?.options ?? [],
                      quizzes: c.existingQuestion.used_in_quizzes,
                      count: c.existingQuestion.usage_count,
                      answer_texts: [],
                    },
                  ]
                : c.answerVariants ?? []

              const chosen = conflictChoice[c.questionIndex] ?? { source: 'current', variantIdx: 0 }
              const currentSelected = chosen.source === 'current'

              return (
                <div
                  key={c.questionIndex}
                  className="rounded-lg border border-incorrect-border bg-card overflow-hidden text-card-foreground"
                >
                  <div className="bg-incorrect-bg px-3 py-2 border-b border-incorrect-border">
                    <p className="font-semibold text-destructive leading-snug">
                      <span className="inline-flex items-center justify-center rounded bg-destructive text-destructive-foreground px-1.5 py-0.5 mr-1.5 text-[10px] font-bold align-middle">
                        Question {c.questionIndex + 1}
                      </span>
                      {q?.text ?? ''}
                    </p>
                  </div>

                  <p className="px-3 pt-2 text-[11px] text-muted-foreground">
                    Select the correct answer to synchronize (default: keep answer from file):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
                    <button
                      type="button"
                      onClick={() =>
                        onConflictChoiceChange(c.questionIndex, { source: 'current', variantIdx: 0 })
                      }
                      className={`text-left rounded-lg border-2 p-3 transition-all cursor-pointer ${
                        currentSelected
                          ? 'border-info-border bg-info-bg'
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      <p className="font-semibold text-info-fg mb-1.5 flex items-center gap-1.5">
                        <span
                          className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                            currentSelected ? 'border-info-fg' : 'border-border'
                          }`}
                        >
                          {currentSelected && <span className="w-1.5 h-1.5 rounded-full bg-info-fg" />}
                        </span>
                        <span>Answer in file (current)</span>
                      </p>
                      <ul className="space-y-1">
                        {importedLines.length > 0 ? (
                          importedLines.map((line, li) => (
                            <li
                              key={li}
                              className="text-card-foreground bg-info-bg/50 rounded px-2 py-1 leading-snug break-words"
                            >
                              {line}
                            </li>
                          ))
                        ) : (
                          <li className="text-muted-foreground italic">(undefined)</li>
                        )}
                      </ul>
                    </button>

                    {variants.map((v, vi) => {
                      const lines = v.correct_answer.map(
                        (i) => `${String.fromCodePoint(65 + i)}. ${v.options[i] ?? ''}`
                      )
                      const bankSelected = chosen.source === 'bank' && chosen.variantIdx === vi
                      return (
                        <button
                          type="button"
                          key={vi}
                          onClick={() =>
                            onConflictChoiceChange(c.questionIndex, { source: 'bank', variantIdx: vi })
                          }
                          className={`text-left rounded-lg border-2 p-3 transition-all cursor-pointer ${
                            bankSelected
                              ? 'border-warning-border bg-warning-bg'
                              : 'border-border bg-card hover:border-primary/50'
                          }`}
                        >
                          <p className="font-semibold text-warning-fg mb-1.5 flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                                bankSelected ? 'border-warning-fg' : 'border-border'
                              }`}
                            >
                              {bankSelected && <span className="w-1.5 h-1.5 rounded-full bg-warning-fg" />}
                            </span>
                            Answer in question bank
                            {v.quizzes.length > 0 && (
                              <span className="font-normal text-muted-foreground">
                                (codes: {v.quizzes.slice(0, 5).join(', ')}
                                {v.quizzes.length > 5 ? ` +${v.quizzes.length - 5}` : ''})
                              </span>
                            )}
                          </p>
                          <ul className="space-y-1">
                            {lines.length > 0 ? (
                              lines.map((line, li) => (
                                <li
                                  key={li}
                                  className="text-card-foreground bg-warning-bg/50 rounded px-2 py-1 leading-snug break-words"
                                >
                                  {line}
                                </li>
                              ))
                            ) : (
                              <li className="text-muted-foreground italic">(undefined)</li>
                            )}
                          </ul>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
