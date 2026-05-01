'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, ImageIcon, AlertCircle, Link as LinkIcon } from 'lucide-react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'

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
    <div className="space-y-2 w-full">
      <div className="flex items-center gap-4">
        {value ? (
          <div className="relative w-[200px] h-[120px] rounded-md overflow-hidden border border-gray-200 shrink-0">
            <div className="z-10 absolute top-2 right-2">
              <Button
                type="button"
                onClick={() => { onRemove(); setErrorMsg(null) }}
                variant="destructive"
                size="icon"
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Image fill className="object-cover" alt="Quiz Image" src={value} />
          </div>
        ) : (
          <div className="w-[200px] h-[120px] shrink-0 rounded-md border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
            <ImageIcon className="h-8 w-8 mb-2" />
            <span className="text-xs">Chưa có ảnh</span>
          </div>
        )}

        <div className="flex-1 space-y-2">
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
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUrlSubmit}
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
              className="flex items-center gap-2"
            >
              <LinkIcon className="h-4 w-4" />
              {value ? 'Thay đổi ảnh' : 'Thêm ảnh từ URL'}
            </Button>
          )}

          {errorMsg ? (
            <div className="flex items-start gap-1.5 text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p className="text-[11px] font-medium leading-snug">{errorMsg}</p>
            </div>
          ) : (
            <p className="text-[10px] text-gray-400">
              Nhập URL ảnh từ nguồn bên ngoài (https://...)
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
