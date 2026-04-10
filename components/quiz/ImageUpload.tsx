'use client'

import { ChangeEvent, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, ImageIcon, AlertCircle } from 'lucide-react'
import Image from 'next/image'

const MAX_FILE_MB = 10
const MIN_WIDTH = 320
const MIN_HEIGHT = 180
const MAX_DIMENSION = 1600

async function readAndScaleImage(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const blob = new Blob([buffer], { type: file.type || 'image/*' })
  const objectUrl = URL.createObjectURL(blob)

  try {
    const img = new globalThis.Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Không thể đọc ảnh'))
      img.src = objectUrl
    })

    const sourceWidth = img.naturalWidth
    const sourceHeight = img.naturalHeight

    if (sourceWidth < MIN_WIDTH || sourceHeight < MIN_HEIGHT) {
      throw new Error(`Ảnh quá nhỏ. Tối thiểu ${MIN_WIDTH}x${MIN_HEIGHT}px.`)
    }

    const longestSide = Math.max(sourceWidth, sourceHeight)
    const scale = longestSide > MAX_DIMENSION ? MAX_DIMENSION / longestSide : 1
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale))
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Không thể xử lý ảnh')

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

    return canvas.toDataURL('image/webp', 0.9)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  onRemove: () => void
}

export function ImageUpload({ value, onChange, onRemove }: Readonly<ImageUploadProps>) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMsg(null)

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setErrorMsg(`File quá lớn. Vui lòng chọn file dưới ${MAX_FILE_MB}MB.`)
      e.target.value = ''
      return
    }

    try {
      const processed = await readAndScaleImage(file)
      onChange(processed)
    } catch (error) {
      setErrorMsg((error as Error).message || 'Không thể xử lý ảnh đã chọn.')
    } finally {
      e.target.value = ''
    }
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
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            title="Tải ảnh minh họa cho câu hỏi"
            aria-label="Tải ảnh minh họa cho câu hỏi"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setErrorMsg(null); fileInputRef.current?.click() }}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {value ? 'Thay đổi ảnh' : 'Tải ảnh từ máy'}
          </Button>

          {errorMsg ? (
            <div className="flex items-start gap-1.5 text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p className="text-[11px] font-medium leading-snug">{errorMsg}</p>
            </div>
          ) : (
            <p className="text-[10px] text-gray-400">
              JPG, PNG, WebP · Tối đa {MAX_FILE_MB}MB · Tối thiểu {MIN_WIDTH}x{MIN_HEIGHT}px
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
