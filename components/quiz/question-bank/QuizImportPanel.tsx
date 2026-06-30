'use client'

import * as React from 'react'
import { AlertCircle, CheckCircle2, Loader2, Upload } from 'lucide-react'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { Button } from '@/components/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Input } from '@/components/shared/ui/input'
import { Badge } from '@/components/shared/ui/badge'

function getSampleUrl(type: 'json' | 'txt'): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''
  const filename = type === 'json' ? 'quiz-valid.json' : 'quiz-valid.txt'
  return `${base}/samples/${filename}`
}

export interface ImportedQuestion {
  text: string
  options: string[]
  correct_answer: number[]
  question_no?: number
  explanation?: string
  image_url?: string
}

export interface ImportedQuiz {
  title: string
  description: string
  category_id?: string
  course_code: string
  questions: ImportedQuestion[]
}

interface ImportDiagnostic {
  level: 'error' | 'warning'
  code: string
  message: string
  questionIndex?: number
}

interface ImportPreviewResponse {
  normalizedQuiz: ImportedQuiz
  diagnostics: ImportDiagnostic[]
  summary: {
    totalQuestions: number
    validQuestions: number
    invalidQuestions: number
    errors: number
    warnings: number
  }
  isValid: boolean
}

interface BankCheckResult {
  total_questions: number
  conflicts_found: number
  same_answer_conflicts: number
  different_answer_conflicts: number
  conflicts: {
    same_answer: Array<{
      questionIndex: number
      conflictType: 'same_answer'
      message: string
    }>
    different_answer: Array<{
      questionIndex: number
      conflictType: 'different_answer'
      message: string
      question?: {
        text: string
        options: string[]
        correct_answer: number[]
      }
      existingQuestion?: {
        correct_answer: number[]
        options?: string[]
        used_in_quizzes: string[]
        usage_count: number
      }
      answerVariants?: Array<{
        correct_answer: number[]
        answer_texts: string[]
        count: number
        quizzes: string[]
        options: string[]
      }>
    }>
  }
  summary: string
}

interface Props {
  onApply: (quiz: ImportedQuiz) => void
  onValidationStateChange?: (hasBlockingErrors: boolean) => void
  onPreviewDiagnosticsChange?: (errors: ImportDiagnostic[]) => void
  onProcessingStateChange?: (isProcessing: boolean) => void
  categoryId?: string
  mode?: 'admin' | 'student'
}

export function QuizImportPanel({ onApply, onValidationStateChange, onPreviewDiagnosticsChange, onProcessingStateChange, categoryId, mode = 'admin' }: Readonly<Props>) {
  const [file, setFile] = React.useState<File | null>(null)
  const [fileSnapshot, setFileSnapshot] = React.useState<File | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [preparingFile, setPreparingFile] = React.useState(false)
  const [downloading, setDownloading] = React.useState<'json' | 'txt' | null>(null)
  const [error, setError] = React.useState('')
  const [preview, setPreview] = React.useState<ImportPreviewResponse | null>(null)
  const [bankCheck, setBankCheck] = React.useState<BankCheckResult | null>(null)
  const [checkingBank, setCheckingBank] = React.useState(false)
  // Per-conflict resolution: which answer the admin picked (and which bank variant).
  const [conflictChoice, setConflictChoice] = React.useState<
    Record<number, { source: 'current' | 'bank'; variantIdx: number }>
  >({})
  const [applying, setApplying] = React.useState(false)
  const [confirmingConflicts, setConfirmingConflicts] = React.useState(false)
  const [conflictsConfirmed, setConflictsConfirmed] = React.useState(false)

  const createFileSnapshot = React.useCallback(async (source: File) => {
    const buffer = await source.arrayBuffer()
    return new File([buffer], source.name, {
      type: source.type || 'application/octet-stream',
      lastModified: source.lastModified,
    })
  }, [])

  const handleDownloadSample = async (type: 'json' | 'txt') => {
    const url = getSampleUrl(type)
    const filename = type === 'json' ? 'quiz-valid.json' : 'quiz-valid.txt'

    setDownloading(type)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('DOWNLOAD_FAILED')
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      setError('Không thể tải file mẫu. Vui lòng thử lại.')
    } finally {
      setDownloading(null)
    }
  }

  const handlePreview = async () => {
    if (!file || !fileSnapshot) {
      setError('Vui lòng chọn file .json hoặc .txt')
      return
    }

    setLoading(true)
    setError('')
    setBankCheck(null)
    setConflictChoice({})
    setConfirmingConflicts(false)
    setConflictsConfirmed(false)
    onProcessingStateChange?.(true)
    try {
      const form = new FormData()
      form.append('file', fileSnapshot)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/import/quiz/preview`, {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders(),
        body: form,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Không thể preview file import')
        setPreview(null)
        onValidationStateChange?.(true)
        onPreviewDiagnosticsChange?.([
          {
            level: 'error',
            code: 'IMPORT_PREVIEW_FAILED',
            message: typeof data?.error === 'string' ? data.error : 'Không thể preview file import',
          },
        ])
        return
      }

      const nextPreview = data as ImportPreviewResponse
      setPreview(nextPreview)
      
      // Check Question Bank if in admin mode and category is selected
      if (mode === 'admin' && categoryId && nextPreview.isValid && nextPreview.normalizedQuiz.questions.length > 0) {
        setCheckingBank(true)
        try {
          const checkRes = await fetch('/api/question-bank/check', {
            method: 'POST',
            headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
            credentials: 'include',
            body: JSON.stringify({
              category_id: categoryId,
              questions: nextPreview.normalizedQuiz.questions.map(q => ({
                text: q.text,
                options: q.options,
                correct_answer: q.correct_answer,
                explanation: q.explanation,
                image_url: q.image_url,
              })),
            }),
          })
          
          if (checkRes.ok) {
            const checkData: BankCheckResult = await checkRes.json()
            setBankCheck(checkData)
          }
        } catch (err) {
          console.error('Question bank check failed:', err)
          // Don't block import if bank check fails
        } finally {
          setCheckingBank(false)
        }
      } else if (mode === 'admin' && !categoryId && nextPreview.isValid) {
        // Cảnh báo: chưa chọn môn học
        setBankCheck({
          total_questions: nextPreview.normalizedQuiz.questions.length,
          conflicts_found: 0,
          same_answer_conflicts: 0,
          different_answer_conflicts: 0,
          conflicts: { same_answer: [], different_answer: [] },
          summary: ' Chưa chọn môn học - không thể kiểm tra Question Bank'
        })
      }
      
      onValidationStateChange?.(!nextPreview.isValid)
      onPreviewDiagnosticsChange?.(nextPreview.diagnostics.filter((item) => item.level === 'error'))
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      const uploadChanged = /upload file changed|ERR_UPLOAD_FILE_CHANGED/i.test(message)
      setError(uploadChanged ? 'File đã thay đổi sau khi chọn. Vui lòng chọn lại file và thử lại.' : 'Lỗi kết nối khi preview import')
      setPreview(null)
      onValidationStateChange?.(true)
      onPreviewDiagnosticsChange?.([
        {
          level: 'error',
          code: uploadChanged ? 'IMPORT_FILE_CHANGED' : 'IMPORT_NETWORK_ERROR',
          message: uploadChanged ? 'File đã thay đổi sau khi chọn. Vui lòng chọn lại file và thử lại.' : 'Lỗi kết nối khi preview import',
        },
      ])
    } finally {
      setLoading(false)
      onProcessingStateChange?.(false)
    }
  }

  // Apply preview to form. Any required bank sync is handled once by the
  // explicit confirmation button before this runs.
  const handleApply = async () => {
    if (!preview) return
    const quiz = preview.normalizedQuiz
    const diffConflicts = bankCheck?.conflicts.different_answer ?? []

    if (diffConflicts.length === 0) {
      onApply(quiz)
      return
    }

    if (!conflictsConfirmed) {
      setError('Vui lòng bấm "Xác nhận lựa chọn đáp án" trước khi áp dụng quiz vào form.')
      return
    }

    setApplying(true)
    try {
      // Clone questions so we can rewrite resolved answers before applying.
      const questions = quiz.questions.map((q) => ({ ...q, options: [...q.options], correct_answer: [...q.correct_answer] }))

      for (const c of diffConflicts) {
        const choice = conflictChoice[c.questionIndex] ?? { source: 'current', variantIdx: 0 }
        if (choice.source === 'bank') {
          // Use the canonical bank answer → rewrite this imported question.
          // Map by answer TEXT (bank indices reference bank option order).
          const fallbackVariants = c.answerVariants ?? []
          const fallbackVariant = fallbackVariants[choice.variantIdx] ?? fallbackVariants[0]
          const variant = c.existingQuestion
            ? {
                correct_answer: c.existingQuestion.correct_answer,
                options: c.existingQuestion.options ?? questions[c.questionIndex]?.options ?? [],
              }
            : fallbackVariant
          const fileQ = questions[c.questionIndex]
          if (variant && fileQ) {
            const answerTexts = variant.correct_answer
              .map((i) => (variant.options[i] ?? '').trim().toLowerCase())
            const remapped = fileQ.options
              .map((opt, idx) => ({ idx, t: opt.trim().toLowerCase() }))
              .filter((o) => answerTexts.includes(o.t))
              .map((o) => o.idx)
            // Fall back to bank indices only if texts didn't resolve.
            fileQ.correct_answer = remapped.length > 0 ? remapped : variant.correct_answer
          }
        }
      }

      onApply({ ...quiz, questions })
    } catch (err) {
      console.error('Apply with conflict resolution failed:', err)
      setError('Không thể áp dụng đáp án đã chọn. Vui lòng thử lại.')
    } finally {
      setApplying(false)
    }
  }

  const handleConfirmConflictChoices = async () => {
    if (!preview || !bankCheck || bankCheck.different_answer_conflicts === 0) return

    setConfirmingConflicts(true)
    setError('')
    try {
      for (const c of bankCheck.conflicts.different_answer) {
        const choice = conflictChoice[c.questionIndex] ?? { source: 'current', variantIdx: 0 }
        if (choice.source !== 'current') continue

        const fileQ = preview.normalizedQuiz.questions[c.questionIndex]
        if (!fileQ) continue
        if (!categoryId) throw new Error('Vui lòng chọn môn học trước khi đồng bộ đáp án.')

        const res = await fetch('/api/question-bank/sync-update', {
          method: 'POST',
          headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
          credentials: 'include',
          body: JSON.stringify({
            category_id: categoryId,
            old_question_id: '',
            new_question: {
              text: fileQ.text,
              options: fileQ.options,
              correct_answer: fileQ.correct_answer,
            },
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(
            typeof data?.error === 'string'
              ? data.error
              : 'Không thể đồng bộ đáp án vào ngân hàng câu hỏi.'
          )
        }
      }

      setConflictsConfirmed(true)
    } catch (err) {
      setConflictsConfirmed(false)
      setError(err instanceof Error ? err.message : 'Không thể đồng bộ đáp án. Vui lòng thử lại.')
    } finally {
      setConfirmingConflicts(false)
    }
  }

  const handleConflictChoiceChange = (
    questionIndex: number,
    choice: { source: 'current' | 'bank'; variantIdx: number }
  ) => {
    setConflictChoice((prev) => ({
      ...prev,
      [questionIndex]: choice,
    }))
    setConflictsConfirmed(false)
  }

  return (
    <Card id="quiz-import-panel" className="bg-white border-[#A4C3A2]">
      <CardHeader className="pb-3">
        <CardTitle className="text-[#5D7B6F] text-lg flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload JSON/TXT Quiz
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void handleDownloadSample('json')} disabled={downloading !== null}>
            {downloading === 'json' ? 'Đang tải...' : 'Tải file mẫu (.json)'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void handleDownloadSample('txt')} disabled={downloading !== null}>
            {downloading === 'txt' ? 'Đang tải...' : 'Tải file mẫu (.txt)'}
          </Button>
        </div>

        <div className="flex flex-col gap-2 md:flex-row">
          <Input
            type="file"
            accept=".json,.txt,application/json,text/plain"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0] ?? null
              setFile(selectedFile)
              setFileSnapshot(null)
              setPreparingFile(false)
              setPreview(null)
              setBankCheck(null)
              setConflictChoice({})
              setConfirmingConflicts(false)
              setConflictsConfirmed(false)
              setError('')
              onValidationStateChange?.(false)
              onPreviewDiagnosticsChange?.([])
              onProcessingStateChange?.(false)

              if (!selectedFile) return

              setPreparingFile(true)
              onProcessingStateChange?.(true)
              void createFileSnapshot(selectedFile)
                .then((snapshot) => {
                  setFileSnapshot(snapshot)
                  onProcessingStateChange?.(false)
                })
                .catch(() => {
                  setFile(null)
                  setFileSnapshot(null)
                  setError('Không thể đọc file đã chọn. Vui lòng thử lại.')
                  onValidationStateChange?.(true)
                  onProcessingStateChange?.(false)
                  onPreviewDiagnosticsChange?.([
                    {
                      level: 'error',
                      code: 'IMPORT_FILE_READ_ERROR',
                      message: 'Không thể đọc file đã chọn. Vui lòng thử lại.',
                    },
                  ])
                })
                .finally(() => {
                  setPreparingFile(false)
                })
            }}
          />
          <Button type="button" onClick={handlePreview} disabled={!file || !fileSnapshot || loading || preparingFile} className="bg-[#5D7B6F] hover:bg-[#5D7B6F]/90">
            {loading || preparingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Preview'}
          </Button>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
            {error}
          </div>
        )}

        {preview && (
          <div className="space-y-3 rounded-md border border-[#A4C3A2]/30 p-3 bg-[#A4C3A2]/5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={preview.isValid ? 'default' : 'secondary'}>
                {preview.isValid ? 'Hợp lệ' : 'Có lỗi'}
              </Badge>
              <span className="text-xs text-gray-600">
                Tổng: {preview.summary.totalQuestions} | Hợp lệ: {preview.summary.validQuestions} | Lỗi: {preview.summary.errors} | Cảnh báo: {preview.summary.warnings}
              </span>
            </div>

            {/* Question Bank Check Results */}
            {checkingBank && (
              <div className="flex items-center gap-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-md p-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang kiểm tra ngân hàng câu hỏi...
              </div>
            )}

            {bankCheck && bankCheck.summary.includes('Chưa chọn môn học') && (
              <div className="bg-orange-50 border border-orange-300 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-orange-900 mb-1">
                       Chưa chọn môn học
                    </p>
                    <p className="text-orange-700">
                      Vui lòng chọn môn học ở trên trước khi upload file để kiểm tra câu hỏi trùng lặp trong Question Bank.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {bankCheck && bankCheck.different_answer_conflicts > 0 && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-bold text-sm text-red-900 mb-0.5">
                      {bankCheck.different_answer_conflicts} câu hỏi có mâu thuẫn đáp án
                    </p>
                    <p className="text-red-700 leading-relaxed mb-3">
                      Cùng câu hỏi + cùng options nhưng đáp án khác với ngân hàng.
                      Chọn đáp án đúng rồi bấm <span className="font-semibold">&quot;Xác nhận lựa chọn đáp án&quot;</span> để đồng bộ.
                    </p>

                    <div className="space-y-3">
                      {bankCheck.conflicts.different_answer.map((c) => {
                        const q = c.question
                        const importedLines = q
                          ? c.question!.correct_answer.map(
                              (i) => `${String.fromCharCode(65 + i)}. ${q.options[i] ?? ''}`
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

                        return (
                          <div
                            key={c.questionIndex}
                            className="rounded-lg border border-red-200 bg-white overflow-hidden"
                          >
                            {/* Question header */}
                            <div className="bg-red-100/60 px-3 py-2 border-b border-red-200">
                              <p className="font-semibold text-red-900 leading-snug">
                                <span className="inline-flex items-center justify-center rounded bg-red-600 text-white px-1.5 py-0.5 mr-1.5 text-[10px] font-bold align-middle">
                                  Câu {c.questionIndex + 1}
                                </span>
                                {q?.text ?? ''}
                              </p>
                            </div>

                            {/* Selectable side-by-side answer comparison */}
                            {(() => {
                              const chosen = conflictChoice[c.questionIndex] ?? { source: 'current', variantIdx: 0 }
                              const currentSelected = chosen.source === 'current'
                              return (
                                <>
                                  <p className="px-3 pt-2 text-[11px] text-gray-500">
                                    Chọn đáp án đúng để đồng bộ (mặc định: giữ đáp án trong file):
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
                                    {/* Current (from file) */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleConflictChoiceChange(c.questionIndex, { source: 'current', variantIdx: 0 })
                                      }
                                      className={`text-left rounded-lg border-2 p-3 transition-all ${
                                        currentSelected
                                          ? 'border-blue-500 bg-blue-50'
                                          : 'border-gray-200 bg-white hover:border-gray-300'
                                      }`}
                                    >
                                      <p className="font-semibold text-blue-700 mb-1.5 flex items-center gap-1.5">
                                        <span
                                          className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                                            currentSelected ? 'border-blue-500' : 'border-gray-300'
                                          }`}
                                        >
                                          {currentSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                        </span>
                                        Đáp án trong file (hiện tại)
                                      </p>
                                      <ul className="space-y-1">
                                        {importedLines.length > 0 ? (
                                          importedLines.map((line, li) => (
                                            <li
                                              key={li}
                                              className="text-gray-800 bg-blue-50 rounded px-2 py-1 leading-snug break-words"
                                            >
                                              {line}
                                            </li>
                                          ))
                                        ) : (
                                          <li className="text-gray-400 italic">(không xác định)</li>
                                        )}
                                      </ul>
                                    </button>

                                    {/* Bank variant(s) */}
                                    {variants.map((v, vi) => {
                                      const lines = v.correct_answer.map(
                                        (i) => `${String.fromCharCode(65 + i)}. ${v.options[i] ?? ''}`
                                      )
                                      const bankSelected = chosen.source === 'bank' && chosen.variantIdx === vi
                                      return (
                                        <button
                                          type="button"
                                          key={vi}
                                          onClick={() =>
                                            handleConflictChoiceChange(c.questionIndex, { source: 'bank', variantIdx: vi })
                                          }
                                          className={`text-left rounded-lg border-2 p-3 transition-all ${
                                            bankSelected
                                              ? 'border-amber-500 bg-amber-50'
                                              : 'border-gray-200 bg-white hover:border-gray-300'
                                          }`}
                                        >
                                          <p className="font-semibold text-amber-700 mb-1.5 flex items-center gap-1.5 flex-wrap">
                                            <span
                                              className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                                                bankSelected ? 'border-amber-500' : 'border-gray-300'
                                              }`}
                                            >
                                              {bankSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                                            </span>
                                            Đáp án trong ngân hàng
                                            {v.quizzes.length > 0 && (
                                              <span className="font-normal text-gray-500">
                                                (mã: {v.quizzes.slice(0, 5).join(', ')}
                                                {v.quizzes.length > 5 ? ` +${v.quizzes.length - 5}` : ''})
                                              </span>
                                            )}
                                          </p>
                                          <ul className="space-y-1">
                                            {lines.length > 0 ? (
                                              lines.map((line, li) => (
                                                <li
                                                  key={li}
                                                  className="text-gray-800 bg-amber-50 rounded px-2 py-1 leading-snug break-words"
                                                >
                                                  {line}
                                                </li>
                                              ))
                                            ) : (
                                              <li className="text-gray-400 italic">(không xác định)</li>
                                            )}
                                          </ul>
                                        </button>
                                      )
                                    })}
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {bankCheck && bankCheck.same_answer_conflicts > 0 && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-yellow-900 mb-1">
                      ✓ {bankCheck.same_answer_conflicts} câu hỏi đã có trong ngân hàng
                    </p>
                    <p className="text-yellow-700">
                      Các câu hỏi này đã tồn tại với cùng đáp án. Có thể tái sử dụng an toàn.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {bankCheck && bankCheck.conflicts_found === 0 && !bankCheck.summary.includes('Chưa chọn môn học') && (
              <div className="bg-green-50 border border-green-300 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-green-900">✅ Tất cả câu hỏi đều mới</p>
                  </div>
                </div>
              </div>
            )}

            <div className="max-h-40 overflow-y-auto space-y-1">
              {preview.diagnostics.map((item, idx) => (
                <div key={`${item.code}-${idx}`} className="text-xs flex items-start gap-2">
                  {item.level === 'error' ? (
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                  )}
                  <span className={item.level === 'error' ? 'text-red-600' : 'text-amber-700'}>
                    {item.questionIndex === undefined ? '' : `Câu ${item.questionIndex + 1}: `}
                    {item.message}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
              {bankCheck && bankCheck.different_answer_conflicts > 0 && (
                <Button
                  type="button"
                  variant={conflictsConfirmed ? 'outline' : 'default'}
                  onClick={() => void handleConfirmConflictChoices()}
                  disabled={!preview.isValid || applying || confirmingConflicts || conflictsConfirmed}
                  className={conflictsConfirmed ? '' : 'bg-blue-600 hover:bg-blue-700'}
                >
                  {confirmingConflicts ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang đồng bộ...
                    </span>
                  ) : conflictsConfirmed ? (
                    'Đã xác nhận lựa chọn'
                  ) : (
                    'Xác nhận lựa chọn đáp án'
                  )}
                </Button>
              )}
              <Button
                type="button"
                onClick={() => void handleApply()}
                disabled={
                  !preview.isValid ||
                  applying ||
                  confirmingConflicts ||
                  Boolean(bankCheck && bankCheck.different_answer_conflicts > 0 && !conflictsConfirmed)
                }
                className="bg-[#5D7B6F] hover:bg-[#5D7B6F]/90"
              >
                {applying ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang áp dụng...
                  </span>
                ) : (
                  'Áp dụng vào form'
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
