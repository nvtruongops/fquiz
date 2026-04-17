'use client'

import React, { useState, useMemo } from 'react'
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
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogTitle, 
  DialogTrigger
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/lib/store/toast-store'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import { withCsrfHeaders } from '@/lib/csrf'

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
  totalStudyMinutes?: number | null
  is_public: boolean
  is_saved_from_explore?: boolean
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
  if (hasAttempt) {
    return (
      <div className={isPassed ? 'text-[#166534]' : 'text-[#B91C1C]'}>
        <p className="text-[11px] font-black uppercase tracking-widest">Đã làm</p>
        <p className="text-[22px] font-black leading-tight">
          {scoreOnTen.toFixed(2)}/10 <span className="text-[14px] font-bold">({quiz.latestCorrectCount}/{quiz.latestTotalCount ?? quiz.questionCount})</span>
        </p>
        <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-gray-500">
          <Clock3 className="h-3.5 w-3.5 text-[#5D7B6F]" />
          Đã học: {totalStudyMinutes} phút
        </p>
      </div>
    )
  }

  if (quiz.is_saved_from_explore) {
    return (
      <Badge variant="outline" className={cn(
        'font-black text-[9px] px-2 py-0.5 rounded-lg',
        isSourceLocked
          ? 'border-red-100 bg-red-50/60 text-red-600'
          : 'border-green-100 bg-green-50/50 text-green-600'
      )}>
        <History className="w-3 h-3 mr-1" /> {isSourceLocked ? 'NGUỒN ĐÃ BỊ ĐÓNG/ẨN' : 'AUTO-SYNC'}
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Bản nháp cá nhân</span>
    </div>
  )
}

function QuizActionsOverlay({
  quiz,
  isDeleting,
  isMoving,
  categories,
  onDelete,
  onMove,
  onBack,
  onConfirmDelete,
}: Readonly<{
  quiz: Quiz
  isDeleting: boolean
  isMoving: boolean
  categories: Category[]
  onDelete: (id: string) => void
  onMove: (quizId: string, categoryId: string) => Promise<unknown>
  onBack: () => void
  onConfirmDelete: () => void
}>) {
  const currentCategoryId = typeof quiz.category_id === 'string' ? quiz.category_id : quiz.category_id?._id
  const [moveCategoryId, setMoveCategoryId] = useState(currentCategoryId || '')

  return (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-10 p-8 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-10">Lựa chọn thao tác</h4>
      <div className="w-full space-y-4">
        {!quiz.is_saved_from_explore && (
          <>
            <Button
              onClick={() => {/* Implement edit navigation */}}
              variant="outline"
              asChild
              className="w-full h-16 rounded-2xl border-none bg-gray-50 text-[#5D7B6F] font-black hover:bg-white hover:shadow-xl hover:shadow-[#5D7B6F]/5 gap-3 transition-all"
            >
              <Link href={`/create?id=${quiz._id}`}>
                <Edit3 className="w-5 h-5" /> Chỉnh sửa bộ đề
              </Link>
            </Button>

            <div className="rounded-2xl border border-[#5D7B6F]/10 p-3 space-y-2 bg-[#F9F9F7]">
              <p className="text-[10px] font-black text-[#5D7B6F] uppercase tracking-widest">Chuyển danh mục</p>
              <div className="flex items-center gap-2">
                <Select value={moveCategoryId} onValueChange={(val) => setMoveCategoryId(val)}>
                  <SelectTrigger className="h-10 rounded-xl border-[#5D7B6F]/20 bg-white text-xs font-bold text-[#5D7B6F]">
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {categories.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  onClick={async () => {
                    await onMove(quiz._id, moveCategoryId)
                  }}
                  disabled={isMoving || !moveCategoryId || moveCategoryId === (currentCategoryId || '')}
                  className="h-10 rounded-xl bg-[#5D7B6F] hover:bg-[#4A6359] text-white px-3"
                >
                  {isMoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </>
        )}

        {quiz.is_saved_from_explore && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-[11px] font-bold text-amber-700">
            Quiz đã lưu từ Explore không thể chuyển danh mục.
          </div>
        )}

        <Button
          onClick={onConfirmDelete}
          variant="outline"
          disabled={isDeleting}
          className="w-full h-16 rounded-2xl border-none bg-red-50 text-red-500 font-black hover:bg-red-100 gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-5 h-5" /> {isDeleting ? 'Bộ đề đang được xử lý...' : 'Xóa bài thi này'}
        </Button>
        <Button
          onClick={onBack}
          variant="ghost"
          className="w-full h-12 rounded-2xl text-gray-400 font-black hover:bg-transparent"
        >
          Hủy bỏ
        </Button>
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
      <DialogContent className="sm:max-w-md rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
        <div className="p-8 flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-8 shadow-inner">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          
          <DialogTitle className="text-xl font-black text-gray-900 mb-2 text-center">
            Xác nhận xóa?
          </DialogTitle>
          
          <DialogDescription className="text-[11px] font-bold text-gray-400 text-center mb-10 px-6 leading-relaxed uppercase tracking-widest opacity-80">
            Bộ đề này sẽ bị gỡ bỏ vĩnh viễn khỏi kho lưu trữ của bạn.
          </DialogDescription>

          <div className="grid grid-cols-2 gap-4 w-full">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              disabled={isDeleting}
              className="h-14 rounded-2xl border-gray-200 font-black text-gray-500 hover:bg-gray-50"
            >
              Hủy
            </Button>
            <Button
              onClick={() => {
                onDelete(quiz._id)
                onOpenChange(false)
              }}
              disabled={isDeleting}
              className="h-14 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black shadow-xl shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Xác nhận xóa'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Sub-component for individual Quiz Card to manage internal UI state (Deletion Flow)
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

  // Hide overlays when deleting
  React.useEffect(() => {
    if (isDeleting) {
      setView('default')
      setShowDeleteDialog(false)
    }
  }, [isDeleting])

  return (
    <>
      <Card className="group relative w-full border-none shadow-lg shadow-[#5D7B6F]/5 rounded-[24px] overflow-hidden bg-white hover:shadow-xl hover:shadow-[#5D7B6F]/10 transition-all duration-300">
        <CardContent className="p-6 relative">
          
          {/* Main Content (Default View) */}
          <div className={cn("transition-all duration-300", view === 'default' ? "opacity-100" : "opacity-10 blur-[4px] pointer-events-none scale-[0.98]")}>
            <div className="flex items-center gap-6">
              {/* Left Section: Quiz Info */}
              <div className="flex-1 min-w-0 space-y-3">
                {/* Category Badge */}
                <Badge variant="secondary" className="rounded-lg px-3 py-1 bg-[#5D7B6F]/5 text-[#5D7B6F] border-none font-black text-[10px] tracking-wider uppercase line-clamp-1 max-w-[180px]" title={categoryName}>
                  {categoryName}
                </Badge>

                {/* Quiz Code */}
                <div className="flex items-start gap-2">
                  <span className="bg-[#5D7B6F] text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shrink-0 mt-0.5">Mã</span>
                  <h3 className="text-lg font-black text-[#5D7B6F] leading-tight break-words line-clamp-2" title={quiz.course_code}>
                    {quiz.course_code}
                  </h3>
                </div>

                {/* Quiz Title */}
                {quiz.title && (
                  <p className="text-xs font-bold text-gray-600 leading-relaxed line-clamp-2" title={quiz.title}>
                    {quiz.title}
                  </p>
                )}

                {/* Quiz Meta Info */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400">
                    <div className="w-6 h-6 bg-gray-50 rounded-lg flex items-center justify-center text-[#A4C3A2]">
                      <BookOpen className="w-3 h-3" />
                    </div>
                    <span className="uppercase tracking-tighter">{quiz.questionCount} CÂU</span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1.5 text-[10px] font-black",
                    quiz.is_public ? 'text-green-500' : 'text-orange-400'
                  )}>
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center",
                      quiz.is_public ? 'bg-green-50' : 'bg-orange-50'
                    )}>
                      {quiz.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    </div>
                    <span className="uppercase tracking-tighter">{quiz.is_public ? 'PUBLIC' : 'PRIVATE'}</span>
                  </div>
                </div>
              </div>

              {/* Middle Section: Status */}
              <div className="flex items-center justify-center px-6 border-l border-r border-gray-100 min-w-[180px]">
                <QuizStatusBadge
                  quiz={quiz}
                  hasAttempt={hasAttempt}
                  isPassed={isPassed}
                  scoreOnTen={scoreOnTen}
                  totalStudyMinutes={totalStudyMinutes}
                  isSourceLocked={isSourceLocked}
                />
              </div>

              {/* Right Section: Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <Button 
                  asChild={!isSourceLocked}
                  disabled={isSourceLocked}
                  className={cn(
                    'rounded-xl px-6 py-5 font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all active:scale-95',
                    isSourceLocked
                      ? 'bg-gray-300 text-white shadow-gray-200 cursor-not-allowed'
                      : 'bg-[#5D7B6F] hover:bg-[#4A6359] text-white shadow-[#5D7B6F]/10'
                  )}
                >
                  {isSourceLocked ? (
                    <span className="inline-flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Đã đóng
                    </span>
                  ) : (
                    <Link href={`/quiz/${quiz._id}`}>
                      {hasAttempt ? 'Làm lại' : 'Ôn tập'}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  )}
                </Button>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setView('actions')}
                  disabled={isDeleting}
                  className="w-10 h-10 rounded-xl bg-gray-50/50 hover:bg-gray-100 text-gray-400 group-hover:text-[#5D7B6F] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* --- OVERLAYS --- */}

          {/* View 1: Actions (Xóa / Hủy) */}
          {view === 'actions' && !isDeleting && (
            <QuizActionsOverlay
              quiz={quiz}
              isDeleting={isDeleting}
              isMoving={isMovingCategory}
              categories={categories}
              onDelete={onDelete}
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

      {/* Delete Confirmation Dialog */}
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
    <Card className="w-full border-none rounded-[24px] overflow-hidden bg-white shadow-lg shadow-[#5D7B6F]/5 animate-pulse">
      <CardContent className="p-6">
        <div className="flex items-center gap-6">
          <div className="flex-1 space-y-3">
            <div className="h-5 w-24 rounded-lg bg-[#EAE7D6]" />
            <div className="h-6 w-40 rounded-lg bg-[#D7F9FA]" />
            <div className="h-4 w-full max-w-md rounded-lg bg-[#EAE7D6]" />
            <div className="flex gap-4">
              <div className="h-6 w-20 rounded-lg bg-[#D7F9FA]" />
              <div className="h-6 w-20 rounded-lg bg-[#D7F9FA]" />
            </div>
          </div>
          <div className="w-[180px] h-16 rounded-xl bg-[#EAE7D6]" />
          <div className="flex gap-3">
            <div className="h-12 w-24 rounded-xl bg-[#B0D4B8]" />
            <div className="h-10 w-10 rounded-xl bg-[#EAE7D6]" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function MyQuizzesPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'personal' | 'saved'>('personal')
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
    }
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
    }
  })

  const allLocalQuizzes = (quizData?.quizzes || []).filter((q: Quiz) => !(q as any).is_temp)
  const ownQuizTotal = allLocalQuizzes.filter((q: Quiz) => !q.is_saved_from_explore).length
  const savedQuizTotal = allLocalQuizzes.filter((q: Quiz) => q.is_saved_from_explore).length

  // 3. Filter Quizzes based on Tab and Search
  const filteredQuizzes = useMemo(() => {
    return allLocalQuizzes.filter((quiz: Quiz) => {
      const isCorrectTab = activeTab === 'saved' ? quiz.is_saved_from_explore : !quiz.is_saved_from_explore
      if (!isCorrectTab) return false
      
      const searchMatch = !debouncedSearch || 
        quiz.course_code.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        quiz.title.toLowerCase().includes(debouncedSearch.toLowerCase())
        
      return searchMatch
    })
  }, [allLocalQuizzes, activeTab, debouncedSearch])

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
      toast.success('Đã xóa bộ đề khỏi kho lưu trữ!')
    },
    onError: (err: any) => {
      toast.error(err.message)
    }
  })

  // 5. Category Mutations
  const createCatMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/categories`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error || 'Không thể tạo danh mục')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'categories'] })
      setNewCategoryName('')
      toast.success('Category created successfully')
    },
    onError: (err: any) => toast.error(err.message)
  })

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
      toast.success('Category deleted')
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
    <div className="space-y-4">
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
        <section className="max-w-7xl mx-auto px-4 pt-12">
          <div className="mb-8 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#5D7B6F] animate-spin" />
            <p className="text-xs font-black text-[#5D7B6F] uppercase tracking-widest">Đang tải kho lưu trữ...</p>
          </div>
          <div className="space-y-4">
            {['a', 'b', 'c', 'd', 'e'].map((id) => (
              <QuizCardSkeleton key={`quiz-skeleton-${id}`} />
            ))}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9F9F7] pb-20">
      {/* Unified Header & Controls Section */}
      <section className="max-w-7xl mx-auto px-4 pt-12">
        <Card className="rounded-[40px] border-none shadow-2xl shadow-[#5D7B6F]/10 overflow-hidden bg-white">
          <CardContent className="p-0">
            {/* Top Row: Title & Category Management */}
            <div className="px-8 py-6 md:px-12 md:py-6 flex flex-col md:flex-row items-center justify-between gap-8 bg-white border-b border-gray-50">
              <div className="space-y-1 text-center md:text-left">
                <h1 className="text-3xl font-black text-[#5D7B6F] flex items-center justify-center md:justify-start gap-3">
                  <Library className="w-9 h-9 text-[#A4C3A2]" /> Bộ đề của tôi
                </h1>
                <p className="text-xs font-bold text-gray-400 max-w-md leading-relaxed">
                  Quản lý và ôn tập các mã đề thi do bạn biên soạn hoặc lưu về.
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
                   <Button className="bg-gray-50 hover:bg-white text-[#5D7B6F] rounded-2xl py-6 px-8 font-black border border-[#5D7B6F]/5 hover:border-[#5D7B6F]/20 shadow-xl shadow-[#5D7B6F]/5 transition-all active:scale-95 flex items-center gap-3">
                      <Settings2 className="w-5 h-5 text-[#A4C3A2]" />
                      Quản lý danh mục
                   </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[32px] border-none shadow-2xl p-0 overflow-hidden w-[calc(100vw-2rem)] sm:max-w-md">
                   <div className="px-6 py-6 sm:px-8 sm:py-8 bg-[#5D7B6F] text-white space-y-2">
                      <DialogTitle className="text-xl sm:text-2xl font-black flex items-center gap-3">
                         <FolderTree className="w-5 h-5 sm:w-6 sm:h-6" /> Danh mục của bạn
                      </DialogTitle>
                     <DialogDescription className="sr-only">
                      Tạo, sửa, xóa danh mục cá nhân và xem số lượng quiz tự tạo hoặc quiz đã lưu trong từng danh mục.
                     </DialogDescription>
                      <p className="text-[10px] sm:text-xs font-bold opacity-70 uppercase tracking-widest">Tối đa 5 danh mục cá nhân ({privateCategoryCount}/5)</p>
                   </div>
                   
                   <div className="px-6 py-6 sm:px-8 sm:py-8 space-y-6">
                      {privateCategoryCount < 5 && (
                        <div className="flex gap-2 items-center">
                          <Input 
                            placeholder="Tên danh mục mới..." 
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && newCategoryName.trim() && createCatMutation.mutate(newCategoryName)}
                            className="h-14 rounded-xl border-[#5D7B6F]/10 font-bold text-sm flex-1"
                          />
                          <Button 
                            onClick={() => newCategoryName.trim() && createCatMutation.mutate(newCategoryName)}
                            disabled={createCatMutation.isPending || !newCategoryName.trim()}
                            className="bg-[#5D7B6F] hover:bg-[#4a6358] h-14 w-14 rounded-xl shrink-0 disabled:opacity-50"
                          >
                             {createCatMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-6 h-6" />}
                          </Button>
                        </div>
                      )}

                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                        {privateCategories.map((cat: any) => {
                          const isConfirming = confirmDeleteCatId === cat._id
                          return (
                            <div key={cat._id} className="group flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-[#5D7B6F]/10 transition-all">
                              {editingCategoryId === cat._id ? (
                                <div className="flex-1 flex gap-2">
                                  <Input 
                                    autoFocus 
                                    value={editingCategoryName}
                                    onChange={(e) => setEditingCategoryName(e.target.value)}
                                    className="h-9 text-xs font-bold"
                                  />
                                  <Button size="sm" onClick={() => updateCatMutation.mutate({ id: cat._id, name: editingCategoryName })}>Lưu</Button>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="text-sm font-black text-[#5D7B6F]">{cat.name}</span>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Tự tạo: {cat.ownQuizCount ?? 0} | Đã lưu: {cat.savedQuizCount ?? 0}
                                  </p>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                {isConfirming ? (
                                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-red-100 animate-in fade-in slide-in-from-right-2 duration-200">
                                   <Button 
                                     size="sm" 
                                     variant="ghost" 
                                     onClick={() => setConfirmDeleteCatId(null)}
                                     className="h-7 px-2 text-[10px] font-black text-gray-400 hover:bg-transparent"
                                   >
                                     Hủy
                                   </Button>
                                   <Button 
                                     size="sm" 
                                     onClick={() => deleteCatMutation.mutate(cat._id)}
                                     className="h-7 px-3 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black rounded-lg transition-all active:scale-95"
                                   >
                                     {deleteCatMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Xác nhận xóa'}
                                   </Button>
                                  </div>
                                ) : (
                                   <>
                                     <Button 
                                       variant="ghost" 
                                       size="icon" 
                                       className="w-8 h-8 rounded-lg"
                                       onClick={() => {
                                         setEditingCategoryId(cat._id)
                                         setEditingCategoryName(cat.name)
                                       }}
                                     >
                                        <Edit3 className="w-3.5 h-3.5 text-gray-400" />
                                     </Button>
                                     <Button 
                                       variant="ghost" 
                                       size="icon" 
                                       className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-500"
                                       onClick={() => setConfirmDeleteCatId(cat._id)}
                                     >
                                        <Trash2 className="w-3.5 h-3.5" />
                                     </Button>
                                   </>
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

            {/* Bottom Section: Search & Filters */}
            <div className="px-8 py-8 md:px-12 md:py-8 space-y-6 bg-gray-50/30">
              <div className="relative group">
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-[#5D7B6F] transition-colors" />
                 <Input 
                   placeholder="Tìm nhanh theo Mã đề, Tên bộ đề hoặc Danh mục..."
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   className="h-16 pl-16 pr-8 rounded-[24px] border-2 border-[#5D7B6F]/20 bg-white shadow-inner font-bold text-[#5D7B6F] text-lg focus:ring-4 focus:ring-[#5D7B6F]/10 focus:border-[#5D7B6F]/40 transition-all"
                 />
              </div>

              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="flex p-1.5 bg-white rounded-2xl w-full lg:w-fit shadow-sm border border-gray-100 min-w-0">
                  <button 
                    onClick={() => setActiveTab('personal')}
                    className={cn(
                      "flex-1 min-w-0 px-3 sm:px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5",
                      activeTab === 'personal' ? "bg-[#5D7B6F] text-white shadow-lg shadow-[#5D7B6F]/20" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    <FolderPlus className="w-4 h-4 shrink-0" />
                    <span className="truncate">Quiz tự tạo</span>
                    <Badge className={cn("shrink-0 border-none px-1.5 text-[10px]", activeTab === 'personal' ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500")}>
                      {ownQuizTotal}
                    </Badge>
                  </button>
                  <button 
                    onClick={() => setActiveTab('saved')}
                    className={cn(
                      "flex-1 min-w-0 px-3 sm:px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5",
                      activeTab === 'saved' ? "bg-[#5D7B6F] text-white shadow-lg shadow-[#5D7B6F]/20" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span className="truncate">Quiz đã lưu</span>
                    <Badge className={cn("shrink-0 border-none px-1.5 text-[10px]", activeTab === 'saved' ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500")}>
                      {savedQuizTotal}
                    </Badge>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                  <Select value={selectedCategoryId || "all"} onValueChange={(val) => setSelectedCategoryId(val === "all" ? null : val)}>
                    <SelectTrigger className="w-full sm:w-[240px] h-14 rounded-2xl border-2 border-[#5D7B6F]/20 bg-white font-black text-xs text-[#5D7B6F] shadow-sm hover:border-[#5D7B6F]/40 transition-all">
                      <SelectValue placeholder="Tất cả danh mục" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      <SelectItem value="all" className="font-black text-xs pl-10 pr-4 py-2.5">Tất cả danh mục</SelectItem>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat._id} value={cat._id} className="font-bold text-xs pl-10 pr-4 py-2.5">
                           {cat.name} (Tự tạo: {cat.ownQuizCount ?? 0} | Đã lưu: {cat.savedQuizCount ?? 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button 
                     asChild
                     className="w-full sm:w-auto bg-[#5D7B6F] hover:bg-[#4A6359] text-white h-14 px-10 rounded-2xl font-black shadow-xl shadow-[#5D7B6F]/20 flex items-center gap-3 transition-all active:scale-95"
                  >
                     <Link href="/create">
                        <Plus className="w-6 h-6" /> Tạo bài thi mới
                     </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Quizzes Grid Section */}
      <section className="max-w-7xl mx-auto px-4 mt-20">
        {filteredQuizzes.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-700">
            <div className="w-24 h-24 rounded-[40px] bg-white shadow-2xl flex items-center justify-center">
               <FileText className="w-10 h-10 text-gray-200" />
            </div>
            <div className="space-y-1">
               <p className="text-lg font-black text-gray-300 uppercase tracking-widest">Không có bộ đề nào</p>
               <p className="text-sm font-bold text-gray-400">Hãy thử đổi bộ lọc hoặc tạo đề thi mới ngay nhé!</p>
            </div>
          </div>
        ) : (
          quizCardsContent
        )}
      </section>

    </div>
  )
}
