'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent } from '@/components/shared/ui/card'
import { Badge } from '@/components/shared/ui/badge'
import { motion } from 'framer-motion'
import { Trophy, HelpCircle, ExternalLink, Bookmark, Loader2 } from 'lucide-react'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { cn } from '@/lib/core/utils/cn'

interface QuizItem {
  _id: string
  title: string
  questionCount: number
  bestScore: number | null
}

interface CourseQuizzesResponse {
  categoryId?: string | null
  categoryName: string
  quizzes: QuizItem[]
  savedQuizIds?: string[]
}

async function fetchCourseQuizzes(code: string): Promise<CourseQuizzesResponse> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/courses/${code}/quizzes`)
  if (!res.ok) throw new Error('Failed to fetch quizzes')
  return res.json()
}

function QuizSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="h-[220px] rounded-3xl animate-pulse bg-white/40 border border-white/60 p-6 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl bg-slate-200 shrink-0" />
              <div className="h-5 w-2/3 bg-slate-200 rounded-lg" />
            </div>
            <div className="space-y-2 pl-11">
              <div className="h-3 w-16 bg-slate-100 rounded-lg" />
              <div className="h-5 w-20 bg-slate-200 rounded-full" />
            </div>
          </div>
          <div className="h-9 w-full bg-slate-200 rounded-2xl" />
        </div>
      ))}
    </div>
  )
}

export default function CourseQuizList({
  code,
  onCategoryNameLoaded,
  onCategoryLoaded,
}: {
  code: string
  onCategoryNameLoaded?: (name: string) => void
  onCategoryLoaded?: (name: string, id: string | null) => void
}) {
  const [savingQuizId, setSavingQuizId] = useState<string | null>(null)
  const [savedQuizIds, setSavedQuizIds] = useState<string[]>([])
  const { toast } = useToast()

  const { data, isLoading, isError } = useQuery<CourseQuizzesResponse>({
    queryKey: ['courseQuizzes', code],
    queryFn: () => fetchCourseQuizzes(code),
    staleTime: 1000 * 60 * 2,
  })

  useEffect(() => {
    if (data?.categoryName) {
      onCategoryNameLoaded?.(data.categoryName)
      onCategoryLoaded?.(data.categoryName, data.categoryId ?? null)
    }
    if (data?.savedQuizIds) {
      setSavedQuizIds(data.savedQuizIds)
    }
  }, [data?.categoryName, data?.categoryId, data?.savedQuizIds, onCategoryNameLoaded, onCategoryLoaded])

  const handleSaveQuiz = async (quizId: string) => {
    setSavingQuizId(quizId)
    try {
      const res = await fetch('/api/student/save-quiz', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ quizId }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Không thể lưu bài thi')
      } else if (json.unsaved) {
        setSavedQuizIds((prev) => prev.filter((id) => id !== quizId))
        toast.success(json.message || 'Đã xóa khỏi Bộ đề của tôi')
      } else {
        setSavedQuizIds((prev) => (prev.includes(quizId) ? prev : [...prev, quizId]))
        toast.success(json.message || 'Đã lưu mã quiz')
      }
    } catch {
      toast.error('Có lỗi xảy ra khi xử lý lưu bài thi')
    } finally {
      setSavingQuizId(null)
    }
  }


  if (isLoading) return <QuizSkeleton />

  if (isError) {
    return (
      <div className="text-center py-12 text-red-600 bg-red-50/50 border border-red-200 rounded-3xl backdrop-blur-md">
        Không thể tải danh sách đề thi. Vui lòng thử lại sau.
      </div>
    )
  }

  const quizzes = data?.quizzes ?? []

  if (quizzes.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500 font-semibold border border-dashed border-slate-300 bg-white/40 backdrop-blur-md rounded-3xl">
        Chưa có đề thi nào trong danh mục này.
      </div>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
    >
      {quizzes.map((quiz) => {
        const isCompleted = quiz.bestScore !== null
        const isSaved = savedQuizIds.includes(quiz._id)

        return (
          <motion.div key={quiz._id} variants={itemVariants} className="h-full">
            <Card className="h-full flex flex-col justify-between border border-white/90 bg-white/70 backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(93,123,111,0.14)] hover:-translate-y-1 transition-all duration-300 group overflow-hidden p-3.5 sm:p-5 gap-3 sm:gap-5 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#5D7B6F]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="space-y-2.5 sm:space-y-4 relative z-10">
                {/* Icon & Title */}
                <div className="flex items-start gap-2.5 sm:gap-3">
                  {isCompleted ? (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs border border-emerald-200/50">
                      <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 shadow-xs border border-slate-200/50">
                      <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  )}
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug tracking-tight group-hover:text-[#5D7B6F] transition-colors duration-300 line-clamp-2" title={quiz.title}>
                    {quiz.title}
                  </h3>
                </div>

                {/* Metadata */}
                <div className="space-y-1.5 sm:space-y-2.5 sm:pl-13">
                  <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5D7B6F]/40" />
                    {quiz.questionCount} câu hỏi
                  </div>
                  <div>
                    {isCompleted ? (
                      <Badge
                        className="border-0 text-white font-extrabold text-[9px] sm:text-[10px] px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 shadow-xs uppercase tracking-wider whitespace-nowrap"
                      >
                        Điểm cao nhất: {(() => {
                          const val = (quiz.bestScore! / quiz.questionCount) * 10
                          return val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)
                        })()}/10
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] text-slate-500 border-slate-200 font-bold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-slate-50/80 uppercase tracking-wider whitespace-nowrap">
                        Chưa thử sức
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2.5 sm:pt-3 border-t border-slate-100 relative z-10 flex items-center gap-2">
                <Link
                  href={`/quiz/${quiz._id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white bg-[#5D7B6F] hover:bg-[#4a6358] shadow-xs hover:shadow-md transition-all active:scale-[0.98] whitespace-nowrap"
                >
                  Bắt đầu làm bài
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleSaveQuiz(quiz._id)
                  }}
                  disabled={savingQuizId === quiz._id}
                  className={cn(
                    'w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 border cursor-pointer shrink-0',
                    isSaved
                      ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-xs'
                      : 'bg-slate-100 hover:bg-[#5D7B6F]/10 text-slate-500 hover:text-[#5D7B6F] border-slate-200/60'
                  )}
                  title="Lưu bộ đề này vào Bộ đề của tôi (/my-quizzes)"
                >
                  {savingQuizId === quiz._id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#5D7B6F]" />
                  ) : (
                    <Bookmark className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4', isSaved && 'fill-current text-amber-500')} />
                  )}
                </button>
              </div>
            </Card>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
