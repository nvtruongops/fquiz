'use client'

import * as React from 'react'
import { AlertCircle, CheckCircle2, Loader2, Upload, UploadCloud, FileText } from 'lucide-react'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { Button } from '@/components/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Input } from '@/components/shared/ui/input'
import { Badge } from '@/components/shared/ui/badge'
import { cn } from '@/lib/core/utils/cn'

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
        question_id?: string
        _id?: string
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
  const [isDragging, setIsDragging] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const createFileSnapshot = React.useCallback(async (source: File) => {
    const buffer = await source.arrayBuffer()
    return new File([buffer], source.name, {
      type: source.type || 'application/octet-stream',
      lastModified: source.lastModified,
    })
  }, [])

  const processSelectedFile = React.useCallback((selectedFile: File | null) => {
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
  }, [createFileSnapshot, onValidationStateChange, onPreviewDiagnosticsChange, onProcessingStateChange])

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files?.[0] ?? null
    if (droppedFile) {
      const ext = droppedFile.name.split('.').pop()?.toLowerCase()
      if (ext === 'json' || ext === 'txt') {
        processSelectedFile(droppedFile)
      } else {
        setError('Chỉ hỗ trợ file định dạng .json hoặc .txt')
      }
    }
  }, [processSelectedFile])

  const handleDownloadSample = async (type: 'json' | 'txt') => {
    const url = getSampleUrl(type)
    const filename = type === 'json' ? 'quiz-valid.json' : 'quiz-valid.txt'

    setDownloading(type)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('DOWNLOAD_FAILED')
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      if (!objectUrl.startsWith('blob:')) {
        throw new Error('Security check failed')
      }
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      link.click()
      URL.revokeObjectURL(objectUrl)
    } catch {
      setError('Không thể tải file mẫu. Vui lòng thử lại.')
    } finally {
      setDownloading(null)
    }
  }

function mapQuestionForBankCheck(q: ImportedQuestion) {
  const opts = q.options.map((o) => o.trim())
  let last = opts.length - 1
  while (last > 1 && !opts[last]) last--
  return {
    text: q.text.trim(),
    options: opts.slice(0, last + 1),
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    image_url: q.image_url,
  }
}

  const performBankCheck = React.useCallback(async (targetPreview: ImportPreviewResponse, catId?: string) => {
    if (mode !== 'admin' || !targetPreview.isValid || targetPreview.normalizedQuiz.questions.length === 0) {
      return
    }

    if (!catId) {
      setBankCheck({
        total_questions: targetPreview.normalizedQuiz.questions.length,
        conflicts_found: 0,
        same_answer_conflicts: 0,
        different_answer_conflicts: 0,
        conflicts: { same_answer: [], different_answer: [] },
        summary: ' Chưa chọn môn học - không thể kiểm tra Question Bank',
      })
      return
    }

    setCheckingBank(true)
    try {
      const checkRes = await fetch('/api/question-bank/check', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          category_id: catId,
          questions: targetPreview.normalizedQuiz.questions.map(mapQuestionForBankCheck),
        }),
      })

      if (checkRes.ok) {
        const checkData: BankCheckResult = await checkRes.json()
        setBankCheck(checkData)
      }
    } catch (err) {
      console.error('Question bank check failed:', err)
    } finally {
      setCheckingBank(false)
    }
  }, [mode])

  React.useEffect(() => {
    if (preview) {
      void performBankCheck(preview, categoryId)
    }
  }, [categoryId, preview, performBankCheck])

  const handlePreviewCatchError = (err: unknown) => {
    const message = err instanceof Error ? err.message : ''
    const uploadChanged = /upload file changed|ERR_UPLOAD_FILE_CHANGED/i.test(message)
    const errText = uploadChanged
      ? 'File đã thay đổi sau khi chọn. Vui lòng chọn lại file và thử lại.'
      : 'Lỗi kết nối khi preview import'

    setError(errText)
    setPreview(null)
    onValidationStateChange?.(true)
    onPreviewDiagnosticsChange?.([
      {
        level: 'error',
        code: uploadChanged ? 'IMPORT_FILE_CHANGED' : 'IMPORT_NETWORK_ERROR',
        message: errText,
      },
    ])
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
      void performBankCheck(nextPreview, categoryId)
      onValidationStateChange?.(!nextPreview.isValid)
      onPreviewDiagnosticsChange?.(nextPreview.diagnostics.filter((item) => item.level === 'error'))
    } catch (err) {
      handlePreviewCatchError(err)
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
          applyBankChoiceToQuestion(c, choice, questions[c.questionIndex])
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

  function applyBankChoiceToQuestion(c: any, choice: any, fileQ: any) {
    const fallbackVariants = c.answerVariants ?? []
    const fallbackVariant = fallbackVariants[choice.variantIdx] ?? fallbackVariants[0]
    const variant = c.existingQuestion
      ? {
          correct_answer: c.existingQuestion.correct_answer,
          options: c.existingQuestion.options ?? fileQ?.options ?? [],
        }
      : fallbackVariant
    if (variant && fileQ) {
      const answerTexts = variant.correct_answer
        .map((i: number) => (variant.options[i] ?? '').trim().toLowerCase())
      const remapped = fileQ.options
        .map((opt: string, idx: number) => ({ idx, t: opt.trim().toLowerCase() }))
        .filter((o: any) => answerTexts.includes(o.t))
        .map((o: any) => o.idx)
      fileQ.correct_answer = remapped.length > 0 ? remapped : variant.correct_answer
    }
  }

async function syncSingleConflictQuestion(fileQ: ImportedQuestion, categoryId: string, oldQuestionId: string = '') {
  const res = await fetch('/api/question-bank/sync-update', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({
      category_id: categoryId,
      old_question_id: oldQuestionId,
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

        const oldQId = c.existingQuestion?.question_id || c.existingQuestion?._id || ''
        await syncSingleConflictQuestion(fileQ, categoryId, oldQId)
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
    <Card id="quiz-import-panel" className="bg-card border-border text-card-foreground">
      <CardHeader className="pb-3">
        <CardTitle className="text-primary text-lg flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload JSON/TXT Quiz
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void handleDownloadSample('json')} disabled={downloading !== null} className="border-border text-card-foreground">
            {downloading === 'json' ? 'Đang tải...' : 'Tải file mẫu (.json)'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void handleDownloadSample('txt')} disabled={downloading !== null} className="border-border text-card-foreground">
            {downloading === 'txt' ? 'Đang tải...' : 'Tải file mẫu (.txt)'}
          </Button>
        </div>

        <div className="space-y-3">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative cursor-pointer flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all text-center group",
              isDragging
                ? "border-primary bg-primary/10 scale-[1.01]"
                : file
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-muted/50 hover:bg-muted hover:border-primary/50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.txt,application/json,text/plain"
              className="hidden"
              onChange={(e) => processSelectedFile(e.target.files?.[0] ?? null)}
            />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              {file ? <FileText className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
            </div>
            {file ? (
              <div className="space-y-1">
                <p className="font-bold text-sm text-primary">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB — Bấm hoặc kéo thả file khác để thay đổi</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-bold text-sm text-card-foreground">
                  Kéo & thả file <span className="text-primary">.JSON</span> hoặc <span className="text-primary">.TXT</span> vào đây
                </p>
                <p className="text-xs text-muted-foreground">Hoặc bấm để chọn file từ máy tính</p>
              </div>
            )}
          </div>

          {file && (
            <div className="flex justify-end">
              <Button type="button" onClick={handlePreview} disabled={!file || !fileSnapshot || loading || preparingFile} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto cursor-pointer">
                {loading || preparingFile ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang xử lý preview...
                  </span>
                ) : (
                  'Xem trước & Kiểm tra mâu thuẫn (Preview)'
                )}
              </Button>
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-destructive bg-incorrect-bg border border-incorrect-border rounded-md p-2">
            {error}
          </div>
        )}

        {preview && (
          <div className="space-y-3 rounded-md border border-border p-3 bg-primary/5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={preview.isValid ? 'default' : 'secondary'}>
                {preview.isValid ? 'Hợp lệ' : 'Có lỗi'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Tổng: {preview.summary.totalQuestions} | Hợp lệ: {preview.summary.validQuestions} | Lỗi: {preview.summary.errors} | Cảnh báo: {preview.summary.warnings}
              </span>
            </div>

            {/* Question Bank Check Results */}
            {checkingBank && (
              <div className="flex items-center gap-2 text-xs text-info-fg bg-info-bg border border-info-border rounded-md p-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang kiểm tra ngân hàng câu hỏi...
              </div>
            )}

            {bankCheck && bankCheck.summary.includes('Chưa chọn môn học') && (
              <div className="bg-warning-bg border border-warning-border rounded-md p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-warning-fg flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-warning-fg mb-1">
                       Chưa chọn môn học
                    </p>
                    <p className="text-warning-fg">
                      Vui lòng chọn môn học ở trên trước khi upload file để kiểm tra câu hỏi trùng lặp trong Question Bank.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {bankCheck && bankCheck.different_answer_conflicts > 0 && (
              <div className="bg-incorrect-bg border border-incorrect-border rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-bold text-sm text-destructive mb-0.5">
                      {bankCheck.different_answer_conflicts} câu hỏi có mâu thuẫn đáp án
                    </p>
                    <p className="text-destructive leading-relaxed mb-3">
                      Cùng câu hỏi + cùng options nhưng đáp án khác với ngân hàng.
                      Chọn đáp án đúng rồi bấm <span className="font-semibold">&quot;Xác nhận lựa chọn đáp án&quot;</span> để đồng bộ.
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

                        return (
                          <div
                            key={c.questionIndex}
                            className="rounded-lg border border-incorrect-border bg-card overflow-hidden text-card-foreground"
                          >
                            {/* Question header */}
                            <div className="bg-incorrect-bg px-3 py-2 border-b border-incorrect-border">
                              <p className="font-semibold text-destructive leading-snug">
                                <span className="inline-flex items-center justify-center rounded bg-destructive text-destructive-foreground px-1.5 py-0.5 mr-1.5 text-[10px] font-bold align-middle">
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
                                  <p className="px-3 pt-2 text-[11px] text-muted-foreground">
                                    Chọn đáp án đúng để đồng bộ (mặc định: giữ đáp án trong file):
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
                                    {/* Current (from file) */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleConflictChoiceChange(c.questionIndex, { source: 'current', variantIdx: 0 })
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
                                        <span>Đáp án trong file (hiện tại)</span>
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
                                          <li className="text-muted-foreground italic">(không xác định)</li>
                                        )}
                                      </ul>
                                    </button>

                                    {/* Bank variant(s) */}
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
                                            handleConflictChoiceChange(c.questionIndex, { source: 'bank', variantIdx: vi })
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
                                            Đáp án trong ngân hàng
                                            {v.quizzes.length > 0 && (
                                              <span className="font-normal text-muted-foreground">
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
                                                  className="text-card-foreground bg-warning-bg/50 rounded px-2 py-1 leading-snug break-words"
                                                >
                                                  {line}
                                                </li>
                                              ))
                                            ) : (
                                              <li className="text-muted-foreground italic">(không xác định)</li>
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
              <div className="bg-warning-bg border border-warning-border rounded-md p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-warning-fg flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-warning-fg mb-1">
                      ✓ {bankCheck.same_answer_conflicts} câu hỏi đã có trong ngân hàng
                    </p>
                    <p className="text-warning-fg">
                      Các câu hỏi này đã tồn tại với cùng đáp án. Có thể tái sử dụng an toàn.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {bankCheck && bankCheck.conflicts_found === 0 && !bankCheck.summary.includes('Chưa chọn môn học') && (
              <div className="bg-success-bg border border-success-border rounded-md p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success-fg flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-success-fg">✅ Tất cả câu hỏi đều mới</p>
                  </div>
                </div>
              </div>
            )}

            <div className="max-h-40 overflow-y-auto space-y-1">
              {preview.diagnostics.map((item, idx) => (
                <div key={`${item.code}-${idx}`} className="text-xs flex items-start gap-2">
                  {item.level === 'error' ? (
                    <AlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-warning-fg mt-0.5" />
                  )}
                  <span className={item.level === 'error' ? 'text-destructive' : 'text-warning-fg'}>
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
                  className={conflictsConfirmed ? 'border-border' : 'bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer'}
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
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
