'use client'

import React from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { useTranslations } from '@fquiz/ui/i18n'

interface UploadDropZoneProps {
  isParsingFile: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDrop: (e: React.DragEvent) => void
}

export function UploadDropZone({
  isParsingFile,
  fileInputRef,
  onFileSelect,
  onDrop,
}: UploadDropZoneProps) {
  const t = useTranslations()
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
      className="border-2 border-dashed border-border hover:border-primary/60 rounded-2xl p-12 text-center bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer space-y-3"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.json"
        onChange={onFileSelect}
        className="hidden"
      />
      <div className="w-14 h-14 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
        {isParsingFile ? (
          <Loader2 className="w-7 h-7 animate-spin" />
        ) : (
          <FileText className="w-7 h-7" />
        )}
      </div>
      <div>
        <p className="text-sm font-bold text-foreground">
          {t('adminUpload.dropPrompt')}
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          {t('adminUpload.formatHint')}
        </p>
      </div>
    </div>
  )
}
