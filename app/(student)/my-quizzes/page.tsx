'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FolderPlus,
  Plus,
  MoreVertical,
  FileText,
  Globe,
  Lock,
  Trash2,
  Edit3,
  Library,
  BookOpen,
  History,
  Clock3,
  Download,
  AlertCircle,
  Search,
  Settings2,
  FolderTree,
  ArrowRightLeft,
  Loader2,
  ArrowRight,
  AlertTriangle,
  Shuffle
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/shared/ui/button'
import { Card, CardContent } from '@/components/shared/ui/card'
import { Input } from '@/components/shared/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger
} from '@/components/shared/ui/dialog'
import { Badge } from '@/components/shared/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select'
import { useToast } from '@/store/shared/toast-store'
import { cn } from '@/lib/core/utils/cn'
import { useDebounce } from '@/hooks/shared/useDebounce'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useCreateCategory } from '@/hooks/quiz/useCreateCategory'

interface Category {
  _id: string
  name: string
  type: 'private' | 'public'
  is_from_saved?: boolean
  ownQuizCount?: number
  savedQuizCount?: number
  totalQuizCount?: number
}

interface Quiz {
  _id: string
  title: string
  course_code: string
  questionCount: number
  latestCorrectCount?: number | null
  latestTotalCount?: number | null
  latestScoreOnTen?: number | null
  latestSessionId?: string | null
  totalStudyMinutes?: number | null
  is_public: boolean
  is_saved_from_explore?: boolean
  is_temp?: boolean
  original_quiz_id?: string
  sourceStatus?: 'available' | 'source_locked' | 'not_applicable'
  status: string
  category_id: string | { _id: string; name: string } | null
}

function QuizStatusBadge({
  quiz,
  hasAttempt,
  isPassed,
  scoreOnTen,
  totalStudyMinutes,
  isSourceLocked,
}: Readonly<{
  quiz: Quiz
  hasAttempt: boolean
  isPassed: boolean
  scoreOnTen: number
  totalStudyMinutes: number
  isSourceLocked: boolean
}>) {
  if (quiz.is_temp) {
    return (
      <Badge variant="outline" className="font-black text-[9px] px-2 py-0.5 rounded-md border-[#5D7B6F] bg-[#5D7B6F]/10 text-[#5D7B6F]">
        <Shuffle className="w-2.5 h-2.5 mr-1" /> QUIZ TRỘN
      </Badge>
    )
  }

  if (hasAttempt) {
    return (
      <div className={isPassed ? 'text-[#166534]' : 'text-[#B91C1C]'}>
        <p className="text-[10px] font-black uppercase tracking-wider">Đã làm</p>
        <p className="text-base sm:text-lg font-black leading-tight">
          {scoreOnTen.toFixed(2)}/10 <span className="text-xs font-bold">({quiz.latestCorrectCount}/{quiz.latestTotalCount ?? quiz.questionCount})</span>
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[9px] font-bold text-gray-500">
          <Clock3 className="h-3 w-3 text-[#5D7B6F]" />
          Đã học: {totalStudyMinutes} phút
        </p>
      </div>
    )
  }

  if (quiz.is_saved_from_explore) {
    return (
      <Badge variant="outline" className={cn(
        'font-black text-[9px] px-2 py-0.5 rounded-md',
        isSourceLocked
          ? 'border-red-100 bg-red-50/60 text-red-600'
          : 'border-green-100 bg-green-50/50 text-green-600'
      )}>
        <History className="w-2.5 h-2.5 mr-1" /> {isSourceLocked ? 'NGUỒN ĐÃ BỊ ĐÓNG' : 'AUTO-SYNC'}
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Bản nháp</span>
    </div>
  )
}

function QuizActionsOverlay({
  quiz,
  isDeleting,
  isMoving,
  categories,
  onMove,
  onBack,
  onConfirmDelete,
}: Readonly<{
  quiz: Quiz
  isDeleting: boolean
  isMoving: boolean
  categories: Category[]
  onMove: (quizId: string, categoryId: string) => Promise<unknown>
  onBack: () => void
  onConfirmDelete: () => void
}>) {
  const currentCategoryId = typeof quiz.category_id === 'string' ? quiz.category_id : quiz.category_id?._id
  const [moveCategoryId, setMoveCategoryId] = useState(currentCategoryId || '')

  return (
    <div className="absolute inset-0 bg-white/70 backdrop-blur-xl z-20 flex flex-col items-center justify-center p-3 animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
      <div className="relative w-full max-w-2xl flex flex-wrap items-center justify-center gap-2 sm:gap-4 py-1 px-2">
        {!quiz.is_saved_from_explore && !quiz.is_temp ? (
          <>
            <Button
              variant="outline"
              asChild
              className="h-9 px-4 rounded-full border-none bg-emerald-500 text-white font-black hover:bg-emerald-600 shadow-sm gap-2 transition-all active:scale-95 text-xs"
            >
              <Link href={`/create?id=${quiz._id}`}>
                <Edit3 className="w-3.5 h-3.5" />
                <span>Chỉnh sửa</span>
              </Link>
            </Button>

            <div className="flex items-center gap-1 bg-slate-900/5 p-0.5 rounded-full border border-slate-900/5">
              <Select value={moveCategoryId} onValueChange={(val) => setMoveCategoryId(val)}>
                <SelectTrigger className="w-[120px] h-8 rounded-full border-none bg-transparent text-[10px] font-bold text-slate-600 focus:ring-0">
                  <SelectValue placeholder="Chuyển..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-xl p-1">
                  {categories.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id} className="text-xs font-bold py-2 rounded-lg cursor-pointer">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={async () => {
                  await onMove(quiz._id, moveCategoryId)
                }}
                disabled={isMoving || !moveCategoryId || moveCategoryId === (currentCategoryId || '')}
                className="h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white shadow-sm transition-all active:scale-90"
              >
                {isMoving ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/10">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 opacity-60" />
            <span className="text-[10px] font-black text-amber-700/80 uppercase tracking-wider">
              {quiz.is_temp ? 'Quiz Trộn Tạm Thời' : 'Saved from Explore'}
            </span>
          </div>
        )}

        <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1" />

        <div className="flex items-center gap-2">
          <Button
            onClick={onConfirmDelete}
            variant="outline"
            disabled={isDeleting}
            className="h-9 px-4 rounded-full border-none bg-rose-500 text-white font-black hover:bg-rose-600 shadow-sm gap-2 transition-all active:scale-95 text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Đang xóa...' : 'Xóa bài'}</span>
          </Button>

          <Button
            onClick={onBack}
            variant="outline"
            className="h-9 px-4 rounded-full border border-slate-200 bg-white text-slate-500 font-bold hover:bg-slate-50 text-xs"
          >
            Hủy
          </Button>
        </div>
      </div>
    </div>
  )
}

function QuizDeleteConfirmDialog({
  quiz,
  isDeleting,
  open,
  onOpenChange,
  onDelete,
}: Readonly<{
  quiz: Quiz
  isDeleting: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (id: string) => void
}>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border border-white/80 bg-white/80 backdrop-blur-2xl shadow-xl p-0 overflow-hidden">
        <div className="p-6 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4 text-red-500">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <DialogTitle className="text-base font-black text-slate-900 mb-1">
            Xác nhận xóa bài này?
          </DialogTitle>

          <DialogDescription className="text-xs font-bold text-slate-400 mb-6 px-4 leading-relaxed">
            Bộ đề này sẽ bị gỡ bỏ vĩnh viễn khỏi kho lưu trữ và giải phóng Quota tài khoản.
          </DialogDescription>

          <div className="grid grid-cols-2 gap-3 w-full">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              disabled={isDeleting}
              className="h-11 rounded-xl border-gray-200 font-bold text-gray-500 hover:bg-gray-50 text-xs"
            >
              Hủy
            </Button>
            <Button
              onClick={() => {
                onDelete(quiz._id)
                onOpenChange(false)
              }}
              disabled={isDeleting}
              className="h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs shadow-md active:scale-95 transition-all"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Xác nhận xóa'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function QuizCard({
  quiz,
  onDelete,
  isDeleting,
  categories,
  onMoveCategory,
  isMovingCategory,
}: Readonly<{
  quiz: Quiz
  onDelete: (id: string) => void
  isDeleting: boolean
  categories: Category[]
  onMoveCategory: (quizId: string, categoryId: string) => Promise<unknown>
  isMovingCategory: boolean
}>) {
  const [view, setView] = useState<'default' | 'actions'>('default')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const hasAttempt = typeof quiz.latestCorrectCount === 'number'
  const scoreOnTen = quiz.latestScoreOnTen ?? 0
  const totalStudyMinutes = Number(quiz.totalStudyMinutes ?? 0)
  const isPassed = scoreOnTen >= 5
  const isSourceLocked = Boolean(quiz.is_saved_from_explore && quiz.sourceStatus === 'source_locked')
  const categoryName = (quiz.category_id as any)?.name || 'Chưa phân loại'

  useEffect(() => {
    if (isDeleting) {
      setView('default')
      setShowDeleteDialog(false)
    }
  }, [isDeleting])

  const displayTitle = quiz.is_temp && quiz.title.startsWith('Quiz Trộn · ')
    ? quiz.title.slice('Quiz Trộn · '.length)
    : quiz.title

  return (
    <>
      <Card className="group relative w-full border border-slate-100 shadow-xs rounded-xl sm:rounded-2xl overflow-hidden bg-white hover:shadow-md transition-all duration-200">
        <CardContent className="p-3 sm:p-4 relative">
          <div className={cn("transition-all duration-300", view === 'default' ? "opacity-100" : "opacity-10 blur-[4px] pointer-events-none scale-[0.98]")}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
              {/* Left Section */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="rounded-md px-2 py-0.5 bg-[#5D7B6F]/10 text-[#5D7B6F] border-none font-bold text-[9px] uppercase line-clamp-1 max-w-[160px]" title={categoryName}>
                    {categoryName}
                  </Badge>
                  {quiz.is_temp && (
                    <Badge variant="outline" className="rounded-md px-2 py-0.5 bg-green-50 text-green-700 border-green-200 font-extrabold text-[9px] uppercase">
                      <Shuffle className="w-2.5 h-2.5 mr-1" /> Quiz Trộn
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-[#5D7B6F] text-white px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase shrink-0">
                    {quiz.is_temp ? 'Loại' : 'Mã'}
                  </span>
                  <h3 className="text-xs sm:text-sm font-black text-[#5D7B6F] leading-none truncate" title={quiz.is_temp ? 'Quiz Trộn' : quiz.course_code}>
                    {quiz.is_temp ? 'Bài Thi Trộn Ngẫu Nhiên' : quiz.course_code}
                  </h3>
                </div>

                {displayTitle && (
                  <p className="text-[11px] font-bold text-slate-600 line-clamp-1" title={displayTitle}>
                    {displayTitle}
                  </p>
                )}

                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                    <BookOpen className="w-3 h-3 text-[#A4C3A2]" />
                    <span>{quiz.questionCount} CÂU</span>
                  </div>
                  <div className={cn("flex items-center gap-1 text-[9px] font-bold", quiz.is_public ? 'text-emerald-600' : 'text-orange-500')}>
                    {quiz.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    <span>{quiz.is_temp ? 'CÁ NHÂN' : quiz.is_public ? 'PUBLIC' : 'PRIVATE'}</span>
                  </div>
                </div>
              </div>

              {/* Middle Section */}
              <div className="flex items-center justify-start sm:justify-center border-t sm:border-t-0 sm:border-l sm:border-r border-slate-100 pt-2 sm:pt-0 sm:px-4 min-w-0 sm:min-w-[150px]">
                <QuizStatusBadge
                  quiz={quiz}
                  hasAttempt={hasAttempt}
                  isPassed={isPassed}
                  scoreOnTen={scoreOnTen}
                  totalStudyMinutes={totalStudyMinutes}
                  isSourceLocked={isSourceLocked}
                />
              </div>

              {/* Right Section */}
              <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                {hasAttempt && (
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-lg sm:rounded-xl px-2 sm:px-2.5 py-1.5 h-8 sm:h-9 font-bold text-xs border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 flex items-center gap-1 transition-all active:scale-95 justify-center cursor-pointer"
                  >
                    <Link href={quiz.latestSessionId ? `/quiz/${quiz._id}/result/${quiz.latestSessionId}` : `/history?search=${encodeURIComponent(quiz.is_temp ? displayTitle : quiz.course_code)}`}>
                      <History className="w-3.5 h-3.5 text-[#5D7B6F]" />
                      <span className="text-[11px] sm:text-xs font-bold">Lịch sử</span>
                    </Link>
                  </Button>
                )}

                <Button
                  asChild={!isSourceLocked}
                  disabled={isSourceLocked}
                  className={cn(
                    'rounded-lg sm:rounded-xl px-3 py-1.5 sm:px-4 sm:py-2.5 h-8 sm:h-9 font-bold text-xs uppercase tracking-wider shadow-xs flex items-center gap-1 transition-all active:scale-95 justify-center',
                    isSourceLocked
                      ? 'bg-gray-300 text-white cursor-not-allowed'
                      : 'bg-[#5D7B6F] hover:bg-[#4A6359] text-white shadow-[#5D7B6F]/10'
                  )}
                >
                  {isSourceLocked ? (
                    <span className="inline-flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Đã đóng
                    </span>
                  ) : (
                    <Link href={`/quiz/${quiz._id}`}>
                      {hasAttempt ? 'Làm lại' : 'Làm bài'}
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setView('actions')}
                  disabled={isDeleting}
                  className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 cursor-pointer shrink-0"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {view === 'actions' && !isDeleting && (
            <QuizActionsOverlay
              quiz={quiz}
              isDeleting={isDeleting}
              isMoving={isMovingCategory}
              categories={categories}
              onMove={async (quizId, categoryId) => {
                await onMoveCategory(quizId, categoryId)
                setView('default')
              }}
              onBack={() => setView('default')}
              onConfirmDelete={() => {
                setView('default')
                setShowDeleteDialog(true)
              }}
            />
          )}
        </CardContent>
      </Card>

      <QuizDeleteConfirmDialog
        quiz={quiz}
        isDeleting={isDeleting}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onDelete={onDelete}
      />
    </>
  )
}

function QuizCardSkeleton() {
  return (
    <Card className="w-full border border-slate-100 rounded-xl overflow-hidden bg-white shadow-xs animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-20 rounded bg-slate-100" />
            <div className="h-5 w-36 rounded bg-slate-100" />
            <div className="h-3 w-48 rounded bg-slate-100" />
          </div>
          <div className="w-28 h-10 rounded bg-slate-100" />
          <div className="h-9 w-20 rounded bg-slate-200" />
        </div>
      </CardContent>
    </Card>
  )
}

import { useSearchParams } from 'next/navigation'

export default function MyQuizzesPage() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const initialTabParam = searchParams.get('tab')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'personal' | 'saved' | 'mix'>(
    initialTabParam === 'saved' ? 'saved' : initialTabParam === 'mix' ? 'mix' : 'personal'
  )

  const [search, setSearch] = useState('')
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false)
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')

  const debouncedSearch = useDebounce(search, 300)

  // 1. Fetch Categories
  const { data: catData, isLoading: catsLoading } = useQuery({
    queryKey: ['student', 'categories'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/categories`)
      if (!res.ok) throw new Error('Failed to fetch categories')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const categories = catData?.categories || []
  const privateCategories = categories.filter((c: any) => c.type === 'private')
  const privateCategoryCount = privateCategories.length

  // 2. Fetch Quizzes
  const { data: quizData, isLoading: quizzesLoading } = useQuery({
    queryKey: ['student', 'quizzes', selectedCategoryId],
    queryFn: async () => {
      const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? globalThis.location.origin}/api/student/quizzes`)
      if (selectedCategoryId) url.searchParams.append('categoryId', selectedCategoryId)
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error('Failed to fetch quizzes')
      return res.json()
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const allQuizzes: Quiz[] = quizData?.quizzes || []
  const ownQuizTotal = allQuizzes.filter((q) => !q.is_saved_from_explore && !q.is_temp).length
  const savedQuizTotal = allQuizzes.filter((q) => q.is_saved_from_explore).length
  const mixQuizTotal = allQuizzes.filter((q) => q.is_temp).length
  const quotaUsedTotal = ownQuizTotal + mixQuizTotal

  // 3. Filter Quizzes based on Tab and Search
  const filteredQuizzes = useMemo(() => {
    return allQuizzes.filter((quiz: Quiz) => {
      let isCorrectTab = false
      if (activeTab === 'personal') isCorrectTab = !quiz.is_saved_from_explore && !quiz.is_temp
      else if (activeTab === 'saved') isCorrectTab = Boolean(quiz.is_saved_from_explore)
      else if (activeTab === 'mix') isCorrectTab = Boolean(quiz.is_temp)

      if (!isCorrectTab) return false

      return !debouncedSearch ||
        quiz.course_code.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        quiz.title.toLowerCase().includes(debouncedSearch.toLowerCase())
    })
  }, [allQuizzes, activeTab, debouncedSearch])

  // 4. Delete Quiz Mutation
  const deleteQuizMutation = useMutation({
    mutationFn: async (quizId: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: withCsrfHeaders()
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error || 'Lỗi khi xóa bộ đề')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'quizzes'] })
      toast.success('Đã xóa bộ đề khỏi kho lưu trữ và giải phóng Quota!')
    },
    onError: (err: any) => {
      toast.error(err.message)
    }
  })

  // 5. Category Mutations
  const createCatMutation = useCreateCategory()

  const updateCatMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string, name: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/categories`, {
        method: 'PATCH',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id, name })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error || 'Không thể cập nhật danh mục')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'categories'] })
      setEditingCategoryId(null)
      toast.success('Category updated')
    },
    onError: (err: any) => toast.error(err.message)
  })

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/categories?id=${id}`, {
        method: 'DELETE',
        headers: withCsrfHeaders()
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error || 'Không thể xóa danh mục')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'categories'] })
      toast.success('Danh mục đã xóa')
    },
    onError: (err: any) => toast.error(err.message)
  })

  const moveQuizCategoryMutation = useMutation({
    mutationFn: async ({ quizId, categoryId }: { quizId: string; categoryId: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/quizzes/${quizId}`, {
        method: 'PATCH',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ category_id: categoryId || null }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error || 'Không thể chuyển quiz sang danh mục khác')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'quizzes'] })
      queryClient.invalidateQueries({ queryKey: ['student', 'categories'] })
      toast.success('Đã chuyển quiz sang danh mục mới')
    },
    onError: (err: any) => toast.error(err.message),
  })

  const quizCardsContent = (
    <div className="space-y-3">
      {filteredQuizzes.map((quiz: Quiz) => (
        <QuizCard
          key={quiz._id}
          quiz={quiz}
          onDelete={(id) => deleteQuizMutation.mutate(id)}
          isDeleting={deleteQuizMutation.isPending && deleteQuizMutation.variables === quiz._id}
          categories={privateCategories}
          onMoveCategory={(quizId, categoryId) => moveQuizCategoryMutation.mutateAsync({ quizId, categoryId })}
          isMovingCategory={moveQuizCategoryMutation.isPending && moveQuizCategoryMutation.variables?.quizId === quiz._id}
        />
      ))}
    </div>
  )

  if (quizzesLoading || catsLoading) {
    return (
      <div className="min-h-screen bg-[#F9F9F7] pb-20">
        <section className="w-full max-w-6xl mx-auto px-3 sm:px-4 pt-6 sm:pt-10">
          <div className="mb-6 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-[#5D7B6F] animate-spin" />
            <p className="text-[11px] font-black text-[#5D7B6F] uppercase tracking-widest">Đang tải kho lưu trữ...</p>
          </div>
          <div className="space-y-3">
            {['a', 'b', 'c', 'd'].map((id) => (
              <QuizCardSkeleton key={`quiz-skeleton-${id}`} />
            ))}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F9F9F7] relative overflow-hidden pb-20">
      {/* Background Mesh Glow */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden transform-gpu -z-10">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#5D7B6F]/15 via-[#A4C3A2]/10 to-transparent blur-3xl opacity-40 transform-gpu" />
      </div>

      {/* Unified Header & Controls Section */}
      <section className="w-full max-w-6xl mx-auto px-3 sm:px-4 pt-3 sm:pt-6 relative z-10">
        <Card className="rounded-xl sm:rounded-2xl border border-white/90 bg-white/80 backdrop-blur-xl shadow-xs overflow-hidden">
          <CardContent className="p-3.5 sm:p-5">
            {/* Top Row: Title & Category Management */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
              <div className="space-y-0.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="text-lg sm:text-2xl font-extrabold text-[#5D7B6F] flex items-center gap-2">
                    <Library className="w-5 h-5 sm:w-6 sm:h-6 text-[#A4C3A2]" /> Bộ đề của tôi
                  </h1>
                  <Badge variant="outline" className={cn(
                    "font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border",
                    quotaUsedTotal >= 10
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-[#5D7B6F]/30 bg-[#5D7B6F]/10 text-[#5D7B6F]"
                  )}>
                    Quota: {quotaUsedTotal}/10 bài (Tự tạo + Trộn)
                  </Badge>
                </div>
                <p className="text-[11px] font-medium text-slate-500 max-w-lg leading-snug">
                  Quản lý các bộ đề tự tạo, đề lưu và đề trộn ngẫu nhiên. Tối đa 10 bài toàn tài khoản.
                </p>
              </div>

              <Dialog
                open={isManageCategoriesOpen}
                onOpenChange={(open) => {
                  setIsManageCategoriesOpen(open)
                  if (!open) {
                    setConfirmDeleteCatId(null)
                    setEditingCategoryId(null)
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button className="bg-slate-50 hover:bg-white text-[#5D7B6F] rounded-xl py-1.5 px-3 h-8 sm:h-9 font-bold border border-slate-200/60 shadow-xs transition-all active:scale-95 flex items-center gap-1.5 text-xs cursor-pointer">
                    <Settings2 className="w-3.5 h-3.5 text-[#A4C3A2]" />
                    Quản lý danh mục
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl border border-white/80 bg-white/80 backdrop-blur-2xl shadow-xl p-0 overflow-hidden w-[calc(100vw-2rem)] sm:max-w-md">
                  <div className="px-4 py-3 bg-[#5D7B6F] text-white space-y-0.5">
                    <DialogTitle className="text-base font-bold flex items-center gap-2">
                      <FolderTree className="w-4 h-4" /> Danh mục của bạn
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Tạo, sửa, xóa danh mục cá nhân và xem số lượng quiz tự tạo hoặc quiz đã lưu trong từng danh mục.
                    </DialogDescription>
                    <p className="text-[10px] font-medium opacity-80 uppercase tracking-wider">Tối đa 5 danh mục cá nhân ({privateCategoryCount}/5)</p>
                  </div>

                  <div className="p-4 space-y-3">
                    {privateCategoryCount < 5 && (
                      <div className="flex gap-2 items-center">
                        <Input
                          placeholder="Tên danh mục mới..."
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && newCategoryName.trim() && createCatMutation.mutate(newCategoryName)}
                          className="h-9 rounded-xl border-slate-200 font-bold text-xs flex-1"
                        />
                        <Button
                          onClick={() => newCategoryName.trim() && createCatMutation.mutate(newCategoryName)}
                          disabled={createCatMutation.isPending || !newCategoryName.trim()}
                          className="bg-[#5D7B6F] hover:bg-[#4a6358] h-9 w-9 rounded-xl shrink-0 disabled:opacity-50 flex items-center justify-center cursor-pointer"
                        >
                          {createCatMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    )}

                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
                      {privateCategories.map((cat: any) => {
                        const isConfirming = confirmDeleteCatId === cat._id
                        return (
                          <div key={cat._id} className="group flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-transparent hover:border-[#5D7B6F]/10 transition-all">
                            {editingCategoryId === cat._id ? (
                              <div className="flex-1 flex gap-2">
                                <Input
                                  autoFocus
                                  value={editingCategoryName}
                                  onChange={(e) => setEditingCategoryName(e.target.value)}
                                  className="h-8 text-xs font-bold"
                                />
                                <Button size="sm" className="h-8 text-xs px-2" onClick={() => updateCatMutation.mutate({ id: cat._id, name: editingCategoryName })}>Lưu</Button>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-xs font-bold text-[#5D7B6F]">{cat.name}</span>
                                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">
                                  Tự tạo: {cat.ownQuizCount ?? 0} | Đã lưu: {cat.savedQuizCount ?? 0}
                                </p>
                              </div>
                            )}

                            <div className="flex items-center gap-1">
                              {isConfirming ? (
                                <div className="flex items-center gap-1 bg-white p-1 rounded-lg shadow-xs border border-red-100">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setConfirmDeleteCatId(null)}
                                    className="h-6 px-1.5 text-[9px] font-bold text-slate-400 hover:bg-transparent"
                                  >
                                    Hủy
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => deleteCatMutation.mutate(cat._id)}
                                    className="h-6 px-2 bg-red-500 hover:bg-red-600 text-white text-[9px] font-bold rounded-md"
                                  >
                                    {deleteCatMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Xóa'}
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-500"
                                  onClick={() => setConfirmDeleteCatId(cat._id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Bottom Section: Search & Controls */}
            <div className="pt-3 space-y-3">
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#5D7B6F] transition-colors" />
                <Input
                  placeholder="Tìm nhanh theo Mã đề, Tên bộ đề hoặc Danh mục..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 sm:h-11 pl-10 pr-4 rounded-xl border border-[#5D7B6F]/20 bg-white shadow-xs font-bold text-[#5D7B6F] text-xs sm:text-sm focus:ring-2 focus:ring-[#5D7B6F]/20 transition-all"
                />
              </div>

              <div className="flex flex-col lg:flex-row items-center justify-between gap-2.5">
                {/* 3 Clean Tabs */}
                <div className="flex p-1 bg-slate-50 rounded-xl w-full lg:w-auto border border-slate-200/60 gap-1 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('personal')}
                    className={cn(
                      "px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0",
                      activeTab === 'personal' ? "bg-[#5D7B6F] text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    <FolderPlus className="w-3.5 h-3.5 shrink-0 hidden sm:block" />
                    <span>Tự tạo</span>
                    <Badge className={cn("shrink-0 border-none px-1.5 py-0.2 text-[9px]", activeTab === 'personal' ? "bg-white/20 text-white" : "bg-slate-200/60 text-slate-600")}>
                      {ownQuizTotal}
                    </Badge>
                  </button>

                  <button
                    onClick={() => setActiveTab('saved')}
                    className={cn(
                      "px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0",
                      activeTab === 'saved' ? "bg-[#5D7B6F] text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    <Download className="w-3.5 h-3.5 shrink-0 hidden sm:block" />
                    <span>Đã lưu</span>
                    <Badge className={cn("shrink-0 border-none px-1.5 py-0.2 text-[9px]", activeTab === 'saved' ? "bg-white/20 text-white" : "bg-slate-200/60 text-slate-600")}>
                      {savedQuizTotal}
                    </Badge>
                  </button>

                  <button
                    onClick={() => setActiveTab('mix')}
                    className={cn(
                      "px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0",
                      activeTab === 'mix' ? "bg-[#5D7B6F] text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    <Shuffle className="w-3.5 h-3.5 shrink-0 hidden sm:block" />
                    <span>Quiz Trộn</span>
                    <Badge className={cn("shrink-0 border-none px-1.5 py-0.2 text-[9px]", activeTab === 'mix' ? "bg-white/20 text-white" : "bg-slate-200/60 text-slate-600")}>
                      {mixQuizTotal}
                    </Badge>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
                  <Select value={selectedCategoryId || "all"} onValueChange={(val) => setSelectedCategoryId(val === "all" ? null : val)}>
                    <SelectTrigger className="w-full sm:w-[220px] h-9 sm:h-11 rounded-xl border border-slate-200/80 bg-white font-bold text-xs text-[#5D7B6F] shadow-xs hover:border-[#5D7B6F]/40 transition-all">
                      <SelectValue placeholder="Tất cả danh mục" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                      <SelectItem value="all" className="font-bold text-xs py-2">Tất cả danh mục</SelectItem>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat._id} value={cat._id} className="font-bold text-xs py-2">
                          {cat.name} (Tự tạo: {cat.ownQuizCount ?? 0} | Đã lưu: {cat.savedQuizCount ?? 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    asChild
                    className="w-full sm:w-auto bg-[#5D7B6F] hover:bg-[#4A6359] text-white h-9 sm:h-11 px-4 sm:px-6 rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Link href="/create">
                      <Plus className="w-4 h-4" /> Tạo bài thi mới
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Quizzes Grid Section */}
      <section className="w-full max-w-6xl mx-auto px-3 sm:px-4 mt-4 sm:mt-6 relative z-10">
        {filteredQuizzes.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
              <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-black text-slate-700 uppercase tracking-wider">Không có bộ đề nào trong mục này</p>
              <p className="text-xs font-bold text-slate-400">Hãy thử đổi bộ lọc hoặc tạo đề thi/trộn bài ngay nhé!</p>
            </div>
          </div>
        ) : (
          quizCardsContent
        )}
      </section>
    </div>
  )
}
