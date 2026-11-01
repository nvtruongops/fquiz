'use client'

import * as React from 'react'
import { FileText, Loader2, UploadCloud } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { cn } from '@/lib/core/utils/cn'
import { useTranslations } from '@fquiz/ui/i18n'

interface QuizImportDropzoneProps {
  file: File | null
  fileSnapshot: File | null
  loading: boolean
  preparingFile: boolean
  downloading: 'json' | 'txt' | null
  isDragging: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  onDownloadSample: (type: 'json' | 'txt') => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onSelectFile: (file: File | null) => void
  onPreview: () => void
}

export function QuizImportDropzone({
  file,
  fileSnapshot,
  loading,
  preparingFile,
  downloading,
  isDragging,
  fileInputRef,
  onDownloadSample,
  onDragOver,
  onDragLeave,
  onDrop,
  onSelectFile,
  onPreview,
}: Readonly<QuizImportDropzoneProps>) {
  const t = useTranslations()
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onDownloadSample('json')}
          disabled={downloading !== null}
          className="border-border text-card-foreground"
        >
          {downloading === 'json' ? t('quizImport.downloading') : t('quizImport.downloadJson')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onDownloadSample('txt')}
          disabled={downloading !== null}
          className="border-border text-card-foreground"
        >
          {downloading === 'txt' ? t('quizImport.downloading') : t('quizImport.downloadTxt')}
        </Button>
      </div>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative cursor-pointer flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all text-center group',
          isDragging
            ? 'border-primary bg-primary/10 scale-[1.01]'
            : file
              ? 'border-primary/40 bg-primary/5'
              : 'border-border bg-muted/50 hover:bg-muted hover:border-primary/50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.txt,application/json,text/plain"
          className="hidden"
          onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
        />
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
          {file ? <FileText className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
        </div>
        {file ? (
          <div className="space-y-1">
            <p className="font-bold text-sm text-primary">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {t('quizImport.fileReplaceHint', { size: (file.size / 1024).toFixed(1) })}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="font-bold text-sm text-card-foreground">
              {t('quizImport.dropPrompt')} <span className="text-primary">.JSON</span> {t('common.or')} <span className="text-primary">.TXT</span> {t('quizImport.fileHere')}
            </p>
            <p className="text-xs text-muted-foreground">{t('quizImport.selectFileHint')}</p>
          </div>
        )}
      </div>

      {file && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onPreview}
            disabled={!fileSnapshot || loading || preparingFile}
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto cursor-pointer"
          >
            {loading || preparingFile ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('quizImport.processingPreview')}
              </span>
            ) : (
              t('quizImport.previewConflicts')
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
