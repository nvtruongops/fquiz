'use client'

import React, { useEffect, useRef } from 'react'
import { BookMarked, Search, X } from 'lucide-react'

interface SelectionToolbarProps {
  selectedText: string
  position: { top: number; left: number }
  onSave: () => void
  onLookup: () => void
  onClose: () => void
}

export function SelectionToolbar({
  selectedText,
  position,
  onSave,
  onLookup,
  onClose,
}: SelectionToolbarProps) {
  const toolbarRef = useRef<HTMLSpanElement>(null)

  // Đóng toolbar khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  if (!selectedText || selectedText.length < 2 || selectedText.length > 500) {
    return null
  }

  return (
    <span
      ref={toolbarRef}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="selection-toolbar-container fixed z-50 -translate-x-1/2 -translate-y-full mb-2 flex items-center gap-1 rounded-full border border-primary/20 bg-background/95 p-1 text-foreground shadow-xl backdrop-blur-md animate-in fade-in zoom-in-90 duration-150 select-none"
    >
      {/* Small action icon trigger button for Quick Save */}
      <button
        type="button"
        onClick={onSave}
        className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs cursor-pointer"
        title="Lưu từ vựng này vào Sổ tay bài học"
      >
        <BookMarked className="h-3.5 w-3.5" />
        <span>Lưu từ</span>
      </button>

      {/* Lookup translation button */}
      <button
        type="button"
        onClick={onLookup}
        className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        title="Xem nghĩa / Dịch nhanh"
      >
        <Search className="h-3.5 w-3.5 text-primary" />
        <span>Xem nghĩa</span>
      </button>

      <button
        type="button"
        onClick={onClose}
        className="rounded-full p-1 hover:bg-muted text-muted-foreground transition-colors cursor-pointer ml-0.5"
        title="Đóng"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

