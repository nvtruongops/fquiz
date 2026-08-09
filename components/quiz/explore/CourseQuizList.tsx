import { useEffect, useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Card } from '@/components/shared/ui/card'
import { Badge } from '@/components/shared/ui/badge'
import { Input } from '@/components/shared/ui/input'
import { motion } from 'framer-motion'
import { Trophy, HelpCircle, ExternalLink, Bookmark, Loader2, Search, Sparkles, Pin } from 'lucide-react'
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
  pinnedQuizIds?: string[]
  isCategoryPinned?: boolean
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
          className="h-[220px] rounded-3xl animate-pulse bg-card border border-border p-6 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl bg-muted shrink-0" />
              <div className="h-5 w-2/3 bg-muted rounded-lg" />
            </div>
            <div className="space-y-2 pl-11">
              <div className="h-3 w-16 bg-muted/60 rounded-lg" />
              <div className="h-5 w-20 bg-muted rounded-full" />
            </div>
          </div>
          <div className="h-9 w-full bg-muted rounded-2xl" />
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
  const [pinnedQuizIds, setPinnedQuizIds] = useState<string[]>([])
  const [pinningQuizId, setPinningQuizId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast()
  const queryClient = useQueryClient()

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

  useEffect(() => {
    if (data?.savedQuizIds) {
      setSavedQuizIds(data.savedQuizIds)
    }
    if (data?.pinnedQuizIds) {
      setPinnedQuizIds(data.pinnedQuizIds)
    }
  }, [data?.savedQuizIds, data?.pinnedQuizIds])

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
      } else {
        const isUnsaving = Boolean(json.unsaved)
        const nextSavedIds = isUnsaving
          ? savedQuizIds.filter((id) => id !== quizId)
          : savedQuizIds.includes(quizId)
          ? savedQuizIds
          : [...savedQuizIds, quizId]

        setSavedQuizIds(nextSavedIds)

        queryClient.setQueryData<CourseQuizzesResponse>(['courseQuizzes', code], (old) => {
          if (!old) return old
          return {
            ...old,
            savedQuizIds: nextSavedIds,
          }
        })

        queryClient.invalidateQueries({ queryKey: ['student', 'quizzes'] })
        queryClient.invalidateQueries({ queryKey: ['student', 'categories'] })

        if (isUnsaving) {
          toast.success(json.message || 'Đã xóa khỏi Bộ đề của tôi')
        } else {
          toast.success(json.message || 'Đã lưu mã quiz')
        }
      }
    } catch {
      toast.error('Có lỗi xảy ra khi xử lý lưu bài thi')
    } finally {
      setSavingQuizId(null)
    }
  }

  const handlePinQuiz = async (quizId: string) => {
    setPinningQuizId(quizId)
    try {
      const res = await fetch('/api/student/pinned-quizzes', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ quizId }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Không thể ghim mã quiz')
      } else {
        const isPinned = Boolean(json.pinned)
        const nextPinned = json.pinnedQuizzes || (
          isPinned
            ? [...pinnedQuizIds, quizId]
            : pinnedQuizIds.filter((id) => id !== quizId)
        )
        setPinnedQuizIds(nextPinned)

        queryClient.setQueryData<CourseQuizzesResponse>(['courseQuizzes', code], (old) => {
          if (!old) return old
          return {
            ...old,
            pinnedQuizIds: nextPinned,
          }
        })

        toast.success(isPinned ? 'Đã ghim mã quiz lên đầu' : 'Đã bỏ ghim mã quiz')
      }
    } catch {
      toast.error('Có lỗi khi ghim mã quiz')
    } finally {
      setPinningQuizId(null)
    }
  }

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number | 'all'>(8)

  const rawQuizzes = data?.quizzes ?? []

  const filteredQuizzes = useMemo(() => {
    let list = rawQuizzes
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = rawQuizzes.filter((quiz) => quiz.title.toLowerCase().includes(q))
    }
    // Sort: Pinned quizzes float to the VERY TOP!
    return [...list].sort((a, b) => {
      const aPinned = pinnedQuizIds.includes(a._id)
      const bPinned = pinnedQuizIds.includes(b._id)
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
      return 0
    })
  }, [rawQuizzes, searchQuery, pinnedQuizIds])

  // Reset page to 1 when search query changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filteredQuizzes.length / pageSize))

  const paginatedQuizzes = useMemo(() => {
    if (pageSize === 'all') return filteredQuizzes
    const start = (currentPage - 1) * pageSize
    return filteredQuizzes.slice(start, start + pageSize)
  }, [filteredQuizzes, currentPage, pageSize])

  const startIndex = pageSize === 'all' ? 1 : (currentPage - 1) * pageSize + 1
  const endIndex = pageSize === 'all' ? filteredQuizzes.length : Math.min(currentPage * pageSize, filteredQuizzes.length)

  if (isLoading) return <QuizSkeleton />

  if (isError) {
    return (
      <div className="text-center py-12 text-red-600 bg-red-50/50 border border-red-200 rounded-3xl backdrop-blur-md">
        Không thể tải danh sách đề thi. Vui lòng thử lại sau.
      </div>
    )
  }

  if (rawQuizzes.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground font-semibold border border-dashed border-border bg-card/40 backdrop-blur-md rounded-3xl">
        Chưa có đề thi nào trong danh mục này.
      </div>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } },
  }

  return (
    <div className="space-y-4">
      {/* Search Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/60 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-border shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm bộ đề theo tên (VD: SP25, FE, RE)..."
            className="pl-10 h-10 rounded-xl border-border text-xs bg-card font-medium text-foreground"
          />
        </div>
        
        <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
          {/* Page Size Selector */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl text-[11px] font-bold">
            <span className="text-muted-foreground px-1.5 hidden md:inline">Hiển thị:</span>
            {[8, 20, 'all'].map((size) => (
              <button
                key={String(size)}
                type="button"
                onClick={() => {
                  setPageSize(size as any)
                  setCurrentPage(1)
                }}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all font-bold cursor-pointer',
                  pageSize === size
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {size === 'all' ? 'Toàn bộ' : size}
              </button>
            ))}
          </div>

          <div className="text-xs font-bold text-muted-foreground px-2 flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary font-black">
              {filteredQuizzes.length > 0 ? `${startIndex}-${endIndex}` : 0}
            </span>{' '}
            / {rawQuizzes.length} bộ đề
          </div>
        </div>
      </div>

      {filteredQuizzes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-xs font-semibold bg-card/40 border border-border rounded-2xl">
          Không tìm thấy bộ đề phù hợp với từ khóa &quot;{searchQuery}&quot;
        </div>
      ) : (
        <>
          <motion.div
            key={`${currentPage}-${pageSize}`}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5"
          >
            {paginatedQuizzes.map((quiz) => {
              const isCompleted = quiz.bestScore !== null
              const isSaved = savedQuizIds.includes(quiz._id)
              const isPinned = pinnedQuizIds.includes(quiz._id)

              return (
                <motion.div key={quiz._id} variants={itemVariants} className="h-full min-w-0">
                  <Card
                    className={cn(
                      'h-full flex flex-col justify-between border bg-card backdrop-blur-2xl rounded-2xl shadow-xs hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 group overflow-hidden p-4 sm:p-5 gap-4 relative',
                      isPinned ? 'border-question-flagged-border shadow-xs' : 'border-border'
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    <div className="space-y-3.5 relative z-10">
                      {/* Header: Icon & Title */}
                      <div className="flex items-start gap-3">
                        {isCompleted ? (
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-success/10 text-success flex items-center justify-center shrink-0 border border-success/20 shadow-2xs">
                            <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center shrink-0 border border-border shadow-2xs">
                            <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          <h3
                            className="text-xs sm:text-sm font-extrabold text-foreground leading-snug tracking-tight group-hover:text-primary transition-colors duration-300 line-clamp-2"
                            title={quiz.title}
                          >
                            {quiz.title}
                          </h3>
                          {isPinned && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-question-flagged-bg text-question-flagged-fg border border-question-flagged-border">
                              <Pin className="w-2.5 h-2.5 fill-current" />
                              Đã ghim
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Metadata & Status Badge */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {quiz.questionCount} câu hỏi
                        </div>

                        <div>
                          {isCompleted ? (
                            <Badge className="border-0 text-white font-extrabold text-[10px] px-3 py-1 rounded-full bg-success shadow-2xs uppercase tracking-wider whitespace-nowrap">
                              Điểm cao nhất: {(() => {
                                const val = (quiz.bestScore! / quiz.questionCount) * 10
                                return val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)
                              })()}/10
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-muted-foreground border-border font-bold px-3 py-1 rounded-full bg-muted uppercase tracking-wider whitespace-nowrap"
                            >
                              Chưa thử sức
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="pt-3 border-t border-border relative z-10 flex items-center gap-2">
                      <Link
                        href={`/quiz/${quiz._id}`}
                        className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-primary-foreground bg-primary hover:bg-primary-hover shadow-2xs hover:shadow-md transition-all active:scale-[0.98]"
                      >
                        Vào làm bài
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handlePinQuiz(quiz._id)
                        }}
                        disabled={pinningQuizId === quiz._id}
                        className={cn(
                          'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-300 border cursor-pointer shrink-0',
                          isPinned
                            ? 'bg-question-flagged-bg text-question-flagged-fg border-question-flagged-border shadow-xs'
                            : 'bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary border-border'
                        )}
                        title={isPinned ? 'Bỏ ghim mã quiz' : 'Ghim mã quiz lên đầu'}
                      >
                        {pinningQuizId === quiz._id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        ) : (
                          <Pin className={cn('w-4 h-4', isPinned && 'fill-current')} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleSaveQuiz(quiz._id)
                        }}
                        disabled={savingQuizId === quiz._id}
                        className={cn(
                          'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-300 border cursor-pointer shrink-0',
                          isSaved
                            ? 'bg-warning-bg/20 text-warning-bg border-warning-bg/40 shadow-2xs'
                            : 'bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary border-border'
                        )}
                        title="Lưu bộ đề vào kho của tôi"
                      >
                        {savingQuizId === quiz._id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        ) : (
                          <Bookmark className={cn('w-4 h-4', isSaved && 'fill-current text-warning-bg')} />
                        )}
                      </button>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-xs font-semibold text-muted-foreground">
                Trang {currentPage} / {totalPages} (Tổng {filteredQuizzes.length} bộ đề)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-border text-xs font-bold bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  &larr; Trước
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      'w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer',
                      currentPage === page
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-border text-xs font-bold bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Sau &rarr;
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

