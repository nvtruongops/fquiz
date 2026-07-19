'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, X, BookOpen, Layers, Pin, Loader2 } from 'lucide-react'
import { Input } from '@/components/shared/ui/input'
import { Card, CardContent } from '@/components/shared/ui/card'
import { motion } from 'framer-motion'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { cn } from '@/lib/core/utils/cn'

interface CategoryItem {
  id: string
  name: string
  quizCount?: number
}

export default function CategoryFilter({ initialCategories }: { initialCategories: CategoryItem[] }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [pinningId, setPinningId] = useState<string | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch student pinned categories
  const { data: pinnedData } = useQuery({
    queryKey: ['student', 'pinned-categories'],
    queryFn: async () => {
      const res = await fetch('/api/student/pinned-categories')
      if (!res.ok) return { pinnedCategories: [] }
      return res.json() as Promise<{ pinnedCategories: string[] }>
    },
  })

  const pinnedIds = pinnedData?.pinnedCategories || []

  const handleTogglePin = async (e: React.MouseEvent, categoryId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setPinningId(categoryId)

    try {
      const res = await fetch('/api/student/pinned-categories', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ categoryId }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Không thể ghim danh mục')
      } else {
        queryClient.setQueryData(['student', 'pinned-categories'], { pinnedCategories: json.pinnedCategories })
        toast.success(json.pinned ? 'Đã ghim danh mục lên đầu' : 'Đã bỏ ghim danh mục')
      }
    } catch {
      toast.error('Có lỗi khi ghim danh mục')
    } finally {
      setPinningId(null)
    }
  }

  const filtered = initialCategories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sortedAndFiltered = [...filtered].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id)
    const bPinned = pinnedIds.includes(b.id)
    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1
    return 0
  })

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-6 sm:mb-8 relative max-w-xl mx-auto w-full px-4 sm:px-0"
      >
        <div className="relative group">
          {/* Subtle Glow Behind Input */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#5D7B6F]/30 to-[#A4C3A2]/20 rounded-full blur-md opacity-30 group-hover:opacity-60 transition duration-500"></div>

          <div className="relative flex items-center">
            <Search className="absolute left-4 text-[#5D7B6F] h-4 w-4 pointer-events-none" />
            <Input
              placeholder="Tìm kiếm môn học (VD: DBS401, PRN211)..."
              className="w-full h-11 sm:h-12 pl-11 pr-10 text-xs sm:text-sm border border-slate-200/80 bg-white/80 backdrop-blur-xl rounded-full shadow-xs focus-visible:ring-2 focus-visible:ring-[#5D7B6F]/20 focus-visible:border-[#5D7B6F] transition-all duration-200 placeholder:text-slate-400 font-medium text-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Xóa tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {sortedAndFiltered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6 w-full">
          {sortedAndFiltered.map((cat) => {
            const isPinned = pinnedIds.includes(cat.id)
            return (
              <motion.div
                key={cat.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <Link href={`/courses/${encodeURIComponent(cat.name.toLowerCase())}`} className="block h-full outline-none">
                  <Card
                    className={cn(
                      'min-h-[140px] sm:min-h-[195px] h-full flex flex-col justify-between cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_45px_rgba(93,123,111,0.22)] border bg-gradient-to-b from-white/80 to-white/50 hover:from-white hover:to-white/80 backdrop-blur-2xl rounded-2xl sm:rounded-3xl overflow-hidden group relative',
                      isPinned ? 'border-amber-400/80 shadow-md shadow-amber-500/10' : 'border-white/90 hover:border-[#5D7B6F]/50'
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#5D7B6F]/10 via-[#A4C3A2]/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />

                    {/* Subtle inner highlight */}
                    <div className="absolute inset-0 border border-white rounded-2xl sm:rounded-3xl pointer-events-none opacity-60"></div>

                    {/* Pin Button */}
                    <button
                      type="button"
                      onClick={(e) => handleTogglePin(e, cat.id)}
                      disabled={pinningId === cat.id}
                      className={cn(
                        'absolute top-2 right-2 sm:top-3 sm:right-3 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer',
                        isPinned
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 scale-105'
                          : 'bg-white/80 text-slate-300 hover:text-amber-500 hover:bg-white shadow-xs'
                      )}
                      title={isPinned ? 'Bỏ ghim danh mục' : 'Ghim danh mục lên đầu'}
                    >
                      {pinningId === cat.id ? (
                        <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
                      ) : (
                        <Pin className={cn('w-3 h-3 sm:w-3.5 sm:h-3.5', isPinned && 'fill-current')} />
                      )}
                    </button>

                    <CardContent className="p-3 sm:p-5 flex flex-col items-center justify-between w-full h-full min-h-[140px] sm:min-h-[195px] relative z-10 gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#5D7B6F]/10 text-[#5D7B6F] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#5D7B6F] group-hover:text-white transition-all duration-300 shadow-xs shrink-0">
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex-1 flex items-center justify-center w-full px-0.5 py-0.5">
                        <span
                          className="text-[11px] sm:text-sm md:text-base font-black text-center tracking-tight leading-tight sm:leading-snug break-words text-slate-800 group-hover:text-[#5D7B6F] transition-colors duration-300 line-clamp-2 sm:line-clamp-3 uppercase"
                        >
                          {cat.name}
                        </span>
                      </div>
                      {typeof cat.quizCount === 'number' && (
                        <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-slate-100 text-[#5D7B6F] group-hover:bg-[#5D7B6F]/15 text-[9px] sm:text-xs font-black uppercase tracking-wider transition-colors shrink-0">
                          <Layers className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          {cat.quizCount} đề thi
                        </span>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 px-4 bg-white/60 backdrop-blur-2xl rounded-3xl border border-white/80 shadow-sm max-w-md mx-auto"
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Không tìm thấy môn học</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1">Hãy thử tìm từ khóa khác như "DBS" hoặc "PRN".</p>
        </motion.div>
      )}
    </div>
  )
}
