'use client'

import * as React from 'react'
import { AlertCircle, CheckCircle2, Loader2, Upload } from 'lucide-react'
import { withCsrfHeaders } from '@/lib/csrf'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const CLOUDINARY_SAMPLE_JSON_URL = 'https://res.cloudinary.com/nvtruongops/raw/upload/v1775711290/fquiz/import-samples/quiz-valid-json'
const CLOUDINARY_SAMPLE_TXT_URL = 'https://res.cloudinary.com/nvtruongops/raw/upload/v1775711738/fquiz/import-samples/quiz-valid-txt'

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

interface Props {
  onApply: (quiz: ImportedQuiz) => void
  onValidationStateChange?: (hasBlockingErrors: boolean) => void
  onPreviewDiagnosticsChange?: (errors: ImportDiagnostic[]) => void
}

export function QuizImportPanel({ onApply, onValidationStateChange, onPreviewDiagnosticsChange }: Readonly<Props>) {
  const [file, setFile] = React.useState<File | null>(null)
  const [fileSnapshot, setFileSnapshot] = React.useState<File | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [preparingFile, setPreparingFile] = React.useState(false)
  const [downloading, setDownloading] = React.useState<'json' | 'txt' | null>(null)
  const [error, setError] = React.useState('')
  const [preview, setPreview] = React.useState<ImportPreviewResponse | null>(null)

  const createFileSnapshot = React.useCallback(async (source: File) => {
    const buffer = await source.arrayBuffer()
    return new File([buffer], source.name, {
      type: source.type || 'application/octet-stream',
      lastModified: source.lastModified,
    })
  }, [])

  const handleDownloadSample = async (type: 'json' | 'txt') => {
    const url = type === 'json' ? CLOUDINARY_SAMPLE_JSON_URL : CLOUDINARY_SAMPLE_TXT_URL
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
    }
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
              setError('')
              onValidationStateChange?.(false)
              onPreviewDiagnosticsChange?.([])

              if (!selectedFile) return

              setPreparingFile(true)
              void createFileSnapshot(selectedFile)
                .then((snapshot) => {
                  setFileSnapshot(snapshot)
                })
                .catch(() => {
                  setFile(null)
                  setFileSnapshot(null)
                  setError('Không thể đọc file đã chọn. Vui lòng thử lại.')
                  onValidationStateChange?.(true)
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

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => onApply(preview.normalizedQuiz)}
                disabled={!preview.isValid}
                className="bg-[#5D7B6F] hover:bg-[#5D7B6F]/90"
              >
                Áp dụng vào form
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
