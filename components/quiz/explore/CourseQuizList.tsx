'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent } from '@/components/shared/ui/card'
import { Badge } from '@/components/shared/ui/badge'
import { motion } from 'framer-motion'
import { Trophy, HelpCircle, ExternalLink } from 'lucide-react'

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
  }, [data?.categoryName, data?.categoryId, onCategoryNameLoaded, onCategoryLoaded])

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
        staggerChildren: 0.08
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } }
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

        return (
          <motion.div key={quiz._id} variants={itemVariants} className="h-full">
            <Card className="h-full flex flex-col justify-between border border-white/80 bg-white/70 backdrop-blur-md rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(93,123,111,0.08)] hover:-translate-y-1.5 transition-all duration-300 group overflow-hidden p-6 gap-5">
              <div className="space-y-4">
                {/* Icon & Title */}
                <div className="flex items-start gap-3">
                  {isCompleted ? (
                    <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0 shadow-sm">
                      <Trophy className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                  )}
                  <h3 className="text-sm font-black text-slate-800 leading-snug tracking-tight group-hover:text-[#5D7B6F] transition-colors duration-300 line-clamp-2" title={quiz.title}>
                    {quiz.title}
                  </h3>
                </div>

                {/* Metadata */}
                <div className="space-y-2.5 pl-11">
                  <div className="text-xs font-bold text-slate-500">
                    {quiz.questionCount} câu hỏi
                  </div>
                  <div>
                    {isCompleted ? (
                      <Badge
                        className="border-0 text-white font-black text-[9px] px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 shadow-sm"
                      >
                        Điểm: {(() => {
                          const val = (quiz.bestScore! / quiz.questionCount) * 10
                          return val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)
                        })()}/10
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] text-slate-500 border-slate-300 font-black px-2.5 py-1 rounded-full bg-slate-50/50">
                        Chưa làm
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-100/60">
                <Link
                  href={`/quiz/${quiz._id}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black text-white bg-[#5D7B6F] hover:bg-[#4a6358] shadow-md shadow-[#5D7B6F]/10 hover:shadow-lg transition-all hover:scale-[1.02]"
                >
                  Xem đề thi
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </Card>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
