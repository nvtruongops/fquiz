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
    queryKey: ['pinned-categories'],
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
        queryClient.invalidateQueries({ queryKey: ['pinned-categories'] })
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

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
  }

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-12 relative max-w-2xl mx-auto w-full px-4 sm:px-0"
      >
        <div className="relative group">
          {/* Animated Glow Behind Input */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#5D7B6F]/40 via-[#A4C3A2]/40 to-[#5D7B6F]/30 rounded-[2.5rem] blur-xl opacity-30 group-hover:opacity-75 transition duration-700"></div>

          <div className="relative flex items-center">
            <Search className="absolute left-6 sm:left-8 text-[#5D7B6F]/80 h-5 w-5 sm:h-6 sm:w-6 pointer-events-none" />
            <Input
              placeholder="Tìm kiếm môn học (VD: DBS401, PRN211)..."
              className="w-full pl-14 sm:pl-16 pr-12 sm:pr-14 py-6 sm:py-7 text-base sm:text-lg border-2 border-white/90 bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] focus-visible:ring-4 focus-visible:ring-[#5D7B6F]/20 focus-visible:border-[#5D7B6F]/60 focus-visible:bg-white transition-all duration-300 placeholder:text-slate-400 font-bold text-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-6 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Xóa tìm kiếm"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {sortedAndFiltered.length > 0 ? (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-6 w-full"
        >
          {sortedAndFiltered.map((cat) => {
            const isPinned = pinnedIds.includes(cat.id)
            return (
              <motion.div key={cat.id} variants={item} className="h-full">
                <Link href={`/courses/${encodeURIComponent(cat.name.toLowerCase())}`} className="block h-full outline-none">
                  <Card
                    className={cn(
                      'min-h-[170px] sm:min-h-[195px] h-full flex flex-col justify-between cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_45px_rgba(93,123,111,0.22)] border bg-gradient-to-b from-white/80 to-white/50 hover:from-white hover:to-white/80 backdrop-blur-2xl rounded-2xl sm:rounded-3xl overflow-hidden group relative',
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
                        'absolute top-3 right-3 z-20 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer',
                        isPinned
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 scale-105'
                          : 'bg-white/80 text-slate-300 hover:text-amber-500 hover:bg-white shadow-xs'
                      )}
                      title={isPinned ? 'Bỏ ghim danh mục' : 'Ghim danh mục lên đầu'}
                    >
                      {pinningId === cat.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Pin className={cn('w-3.5 h-3.5', isPinned && 'fill-current')} />
                      )}
                    </button>

                    <CardContent className="p-4 sm:p-5 flex flex-col items-center justify-between w-full h-full min-h-[170px] sm:min-h-[195px] relative z-10 gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#5D7B6F]/10 text-[#5D7B6F] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#5D7B6F] group-hover:text-white transition-all duration-300 shadow-sm shrink-0">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="flex-1 flex items-center justify-center w-full px-1 py-1">
                        <span
                          className="text-xs sm:text-sm md:text-base font-black text-center tracking-tight leading-snug break-words text-slate-800 group-hover:text-[#5D7B6F] transition-colors duration-300 line-clamp-3 uppercase"
                        >
                          {cat.name}
                        </span>
                      </div>
                      {typeof cat.quizCount === 'number' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[#5D7B6F] group-hover:bg-[#5D7B6F]/15 text-[10px] sm:text-xs font-black uppercase tracking-wider transition-colors shrink-0">
                          <Layers className="w-3 h-3" />
                          {cat.quizCount} đề thi
                        </span>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
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
