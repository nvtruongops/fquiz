'use client'

import React, { useEffect, useState, useRef } from 'react'
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
  const toolbarRef = useRef<HTMLDivElement>(null)

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

  if (!selectedText) return null

  return (
    <div
      ref={toolbarRef}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="fixed z-50 -translate-x-1/2 -translate-y-full mb-2 flex items-center gap-1.5 rounded-lg border border-border bg-popover/95 p-1 text-popover-foreground shadow-lg backdrop-blur-sm animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      <button
        onClick={onSave}
        className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <BookMarked className="h-3.5 w-3.5" />
        <span>Lưu từ vựng</span>
      </button>

      <button
        onClick={onLookup}
        className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Xem nghĩa</span>
      </button>

      <div className="h-4 w-px bg-border mx-0.5" />

      <button
        onClick={onClose}
        className="rounded-md p-1 hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
        title="Đóng"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
