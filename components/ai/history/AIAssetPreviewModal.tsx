'use client'

import React from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/shared/ui/dialog'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { Sparkles, FileText, CheckCircle2, ChevronLeft, ChevronRight, RotateCw, HelpCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { AILearningLogItem } from '@/hooks/useAIHistory'

interface AIAssetPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  selectedLog: AILearningLogItem | null
  logContent: any
  logParams: any
  userSubmission: string
  evalResult: any
  writingSourceText: string
  writingScore?: number
  showParagraphTranslation: boolean
  setShowParagraphTranslation: React.Dispatch<React.SetStateAction<boolean>>
  showStoryTranslation: boolean
  setShowStoryTranslation: React.Dispatch<React.SetStateAction<boolean>>
  flashcardIndex: number
  setFlashcardIndex: React.Dispatch<React.SetStateAction<number>>
  isFlipped: boolean
  setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>
  showHint: boolean
  setShowHint: React.Dispatch<React.SetStateAction<boolean>>
  writingModalSubTab: 'config' | 'eval'
  setWritingModalSubTab: React.Dispatch<React.SetStateAction<'config' | 'eval'>>
}

export default function AIAssetPreviewModal({
  isOpen,
  onClose,
  selectedLog,
  logContent,
  logParams,
  userSubmission,
  evalResult,
  writingSourceText,
  writingScore,
  showParagraphTranslation,
  setShowParagraphTranslation,
  showStoryTranslation,
  setShowStoryTranslation,
  flashcardIndex,
  setFlashcardIndex,
  isFlipped,
  setIsFlipped,
  showHint,
  setShowHint,
  writingModalSubTab,
  setWritingModalSubTab,
}: AIAssetPreviewModalProps) {
  if (!selectedLog) return null

  const createdDateStr = selectedLog.createdAt ? format(new Date(selectedLog.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi }) : ''

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] rounded-3xl p-6 overflow-hidden flex flex-col border border-border bg-card text-card-foreground shadow-2xl z-50">
        <DialogTitle className="text-lg sm:text-xl font-black text-card-foreground line-clamp-1">
          {selectedLog.title}
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2">
          <span>Tạo lúc: {createdDateStr}</span>
          {selectedLog.language && <span className="uppercase font-bold text-primary">({selectedLog.language})</span>}
        </DialogDescription>

        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
          {!logContent ? (
            <div className="bg-muted p-6 rounded-2xl text-center text-xs font-bold text-muted-foreground">
              Không thể hiển thị nội dung xem trước
            </div>
          ) : (
            <div className="space-y-4">
              {/* Type specific renderings */}
              {selectedLog.type === 'vocabulary' && (
                <div className="space-y-3">
                  {(Array.isArray(logContent) ? logContent : [logContent]).map((wordItem: any, idx: number) => (
                    <div key={idx} className="bg-muted/50 p-4 rounded-2xl border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-black text-card-foreground">{wordItem.lemma || wordItem.display}</span>
                        {wordItem.ipa && <span className="text-xs font-mono text-primary">/{wordItem.ipa}/</span>}
                      </div>
                      <p className="text-xs font-semibold text-card-foreground">{wordItem.definition}</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedLog.type === 'grammar' && (
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 space-y-2">
                  <h4 className="text-sm font-black text-primary">{logContent.patternName || 'Ngữ pháp'}</h4>
                  <p className="text-xs font-bold text-card-foreground">{logContent.explanation}</p>
                </div>
              )}

              {/* Fallback display for JSON structure */}
              {!['vocabulary', 'grammar'].includes(selectedLog.type) && (
                <div className="bg-muted text-card-foreground p-4 rounded-2xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-96 border border-border">
                  <pre>{JSON.stringify(logContent, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
