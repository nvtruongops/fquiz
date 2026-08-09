'use client'

import React from 'react'
import { Button } from '@/components/shared/ui/button'
import { BookMarked, X } from 'lucide-react'

interface AISavedAssetsDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function AISavedAssetsDrawer({ isOpen, onClose }: AISavedAssetsDrawerProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card text-card-foreground h-full shadow-2xl p-6 flex flex-col justify-between border-l border-border">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-black text-card-foreground flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-primary" /> Tri Thức & Bookmark AI Đã Lưu
            </h3>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-card-foreground cursor-pointer">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Các thẻ từ vựng, mẫu câu và nguyên lý ngữ pháp bạn đã lưu từ AI Studio sẽ được tự động đồng bộ vào hệ thống Flashcard SRS để ôn tập hàng ngày.
          </p>
        </div>

        <div className="pt-4 border-t border-border">
          <Button onClick={onClose} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl h-10 cursor-pointer">
            Đóng bảng xem
          </Button>
        </div>
      </div>
    </div>
  )
}
