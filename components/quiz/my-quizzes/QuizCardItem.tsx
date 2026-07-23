'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/shared/ui/card'
import { Badge } from '@/components/shared/ui/badge'
import { Button } from '@/components/shared/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/shared/ui/dialog'
import {
  Shuffle, BookOpen, Globe, Lock, History, ArrowRight, MoreVertical,
  Edit3, Trash2, ArrowRightLeft, Loader2, AlertCircle, AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import { Quiz, Category } from '@/hooks/useMyQuizzes'
import { QuizStatusBadge } from './QuizStatusBadge'

interface QuizCardItemProps {
  quiz: Quiz
  onDelete: (id: string) => void
  isDeleting: boolean
  categories: Category[]
  onMoveCategory: (quizId: string, categoryId: string) => Promise<unknown>
  isMovingCategory: boolean
}

export const QuizCardItem = React.memo(function QuizCardItem({
  quiz,
  onDelete,
  isDeleting,
  categories,
  onMoveCategory,
  isMovingCategory,
}: QuizCardItemProps) {
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

  const currentCategoryId = typeof quiz.category_id === 'string' ? quiz.category_id : quiz.category_id?._id
  const [moveCategoryId, setMoveCategoryId] = useState(currentCategoryId || '')

  return (
    <>
      <Card className="group relative w-full border border-slate-100 shadow-xs rounded-xl sm:rounded-2xl overflow-hidden bg-white hover:shadow-md transition-all duration-200">
        <CardContent className="p-3 sm:p-4 relative">
          <div className={cn('transition-all duration-300', view === 'default' ? 'opacity-100' : 'opacity-10 blur-[4px] pointer-events-none scale-[0.98]')}>
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
                  <div className={cn('flex items-center gap-1 text-[9px] font-bold', quiz.is_public ? 'text-emerald-600' : 'text-orange-500')}>
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

          {/* Action Overlay */}
          {view === 'actions' && !isDeleting && (
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
                          await onMoveCategory(quiz._id, moveCategoryId)
                          setView('default')
                        }}
                        disabled={isMovingCategory || !moveCategoryId || moveCategoryId === (currentCategoryId || '')}
                        className="h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white shadow-sm transition-all active:scale-90"
                      >
                        {isMovingCategory ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
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
                    onClick={() => {
                      setView('default')
                      setShowDeleteDialog(true)
                    }}
                    variant="outline"
                    disabled={isDeleting}
                    className="h-9 px-4 rounded-full border-none bg-rose-500 text-white font-black hover:bg-rose-600 shadow-sm gap-2 transition-all active:scale-95 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeleting ? 'Đang xóa...' : 'Xóa bài'}</span>
                  </Button>

                  <Button
                    onClick={() => setView('default')}
                    variant="outline"
                    className="h-9 px-4 rounded-full border border-slate-200 bg-white text-slate-500 font-bold hover:bg-slate-50 text-xs"
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
                onClick={() => setShowDeleteDialog(false)}
                variant="outline"
                disabled={isDeleting}
                className="h-11 rounded-xl border-gray-200 font-bold text-gray-500 hover:bg-gray-50 text-xs"
              >
                Hủy
              </Button>
              <Button
                onClick={() => {
                  onDelete(quiz._id)
                  setShowDeleteDialog(false)
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
    </>
  )
})
