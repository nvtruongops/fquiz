'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/shared/ui/button'
import { X, ImageIcon, AlertCircle, Link as LinkIcon } from 'lucide-react'
import Image from 'next/image'
import { Input } from '@/components/shared/ui/input'

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  onRemove: () => void
}

export function ImageUpload({ value, onChange, onRemove }: Readonly<ImageUploadProps>) {
  const [urlInput, setUrlInput] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)

  const handleUrlSubmit = () => {
    setErrorMsg(null)
    
    if (!urlInput.trim()) {
      setErrorMsg('Vui lòng nhập URL ảnh')
      return
    }

    // Validate URL format
    try {
      const url = new URL(urlInput.trim())
      if (!url.protocol.startsWith('http')) {
        setErrorMsg('URL phải bắt đầu bằng http:// hoặc https://')
        return
      }
    } catch {
      setErrorMsg('URL không hợp lệ')
      return
    }

    onChange(urlInput.trim())
    setUrlInput('')
    setShowUrlInput(false)
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col gap-3">
        {value ? (
          <div className="relative w-full aspect-video max-h-[160px] rounded-2xl overflow-hidden border border-border bg-muted group/img shadow-inner shrink-0">
            <div className="z-10 absolute top-3 right-3 opacity-0 group-hover/img:opacity-100 transition-opacity">
              <Button
                type="button"
                onClick={() => { onRemove(); setErrorMsg(null) }}
                variant="destructive"
                size="icon"
                className="h-8 w-8 rounded-xl shadow-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Image fill className="object-contain" alt="Quiz Image" src={value} />
          </div>
        ) : (
          <div className="w-full aspect-video max-h-[160px] shrink-0 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center bg-muted/50 text-muted-foreground transition-all hover:bg-muted hover:border-primary/50 group/empty">
            <ImageIcon className="h-10 w-10 mb-2 group-hover/empty:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Chưa có ảnh</span>
          </div>
        )}

        <div className="space-y-3">
          {showUrlInput ? (
            <div className="space-y-2">
              <Input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleUrlSubmit()
                  }
                }}
                className="text-sm border-border bg-card text-card-foreground"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUrlSubmit}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                >
                  Thêm ảnh
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowUrlInput(false)
                    setUrlInput('')
                    setErrorMsg(null)
                  }}
                  className="border-border text-card-foreground hover:bg-muted cursor-pointer"
                >
                  Hủy
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setErrorMsg(null); setShowUrlInput(true) }}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border-border text-primary font-bold hover:bg-primary/10 transition-all cursor-pointer"
            >
              <LinkIcon className="h-4 w-4" />
              {value ? 'Thay đổi ảnh' : 'Thêm ảnh từ URL'}
            </Button>
          )}

          {errorMsg ? (
            <div className="flex items-start gap-1.5 text-destructive bg-incorrect-bg border border-incorrect-border rounded-xl px-3 py-2 animate-in fade-in zoom-in-95 duration-200">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
              <p className="text-[11px] font-bold leading-tight text-destructive">{errorMsg}</p>
            </div>
          ) : (
            <p className="text-[10px] font-bold text-muted-foreground leading-relaxed text-center px-2">
              Dán link ảnh trực tiếp từ Google, Pinterest... (https://)
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
