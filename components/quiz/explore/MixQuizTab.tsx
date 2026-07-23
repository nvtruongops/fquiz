'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Shuffle, AlertTriangle, Loader2, PlayCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select'
import { cn } from '@/lib/core/utils/cn'

import { useMixQuizGenerator, ActiveMixSession } from '@/hooks/useMixQuizGenerator'

interface MixQuizTabProps {
  onSessionCreated?: (quizId: string, sessionId: string) => void
  embedded?: boolean
}

function ActiveSessionBanner({
  session,
  onContinue,
  onCreateNew,
  isDeleting,
}: {
  session: ActiveMixSession
  onContinue: () => void
  onCreateNew: () => void
  isDeleting: boolean
}) {
  const modeLabel = session.mode === 'immediate' ? 'Luyện tập' : 'Kiểm tra'
  const modeColor = session.mode === 'immediate' ? 'text-green-600' : 'text-blue-600'
  const modeBg = session.mode === 'immediate' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'

  return (
    <div className="bg-white rounded-[24px] border-2 border-[#5D7B6F]/20 p-6 space-y-5 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#5D7B6F]/10 flex items-center justify-center">
          <Shuffle className="w-5 h-5 text-[#5D7B6F]" />
        </div>
        <div>
          <h3 className="font-black text-gray-900">Bạn có một Quiz Trộn chưa hoàn thành</h3>
          <p className="text-sm text-gray-500">Tiếp tục hay tạo quiz mới?</p>
        </div>
      </div>

      <div className={cn('rounded-2xl p-4 border space-y-2', modeBg)}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#5D7B6F] text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
            Quiz Trộn
          </span>
          <span className="px-2 py-0.5 rounded-full bg-white/80 text-slate-600 text-[10px] font-bold">
            {session.question_count} câu
          </span>
          <span className={cn('px-2 py-0.5 rounded-full bg-white/80 text-[10px] font-bold', modeColor)}>
            {modeLabel}
          </span>
        </div>
        <p className="font-black text-slate-800 text-sm leading-snug line-clamp-2 break-words">
          {session.title.startsWith('Quiz Trộn · ') ? session.title.slice('Quiz Trộn · '.length) : session.title}
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onContinue}
          className="flex-1 bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-black rounded-2xl h-12 gap-2"
        >
          <PlayCircle className="w-4 h-4" />
          Làm tiếp
        </Button>
        <Button
          onClick={onCreateNew}
          disabled={isDeleting}
          variant="outline"
          className="flex-1 border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600 font-black rounded-2xl h-12 gap-2"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Làm mới
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export function MixQuizTab({ onSessionCreated, embedded }: MixQuizTabProps) {
  const router = useRouter()
  const {
    selectedCategoryId, setSelectedCategoryId,
    selectedQuizIds,
    toggleQuiz,
    questionCount, setQuestionCount,
    mode, setMode,
    rateLimitMsg,
    poolWarning,
    activeSessionData,
    categories, catsLoading,
    quizzes, quizzesLoading,
    totalPool,
    canStart,
    createMutation,
    deleteActiveSessionMutation,
  } = useMixQuizGenerator(embedded, onSessionCreated)

  const activeSession = activeSessionData?.session

  if (activeSession) {
    return (
      <div className="max-w-xl mx-auto py-6">
        <ActiveSessionBanner
          session={activeSession}
          onContinue={() => router.push(`/quiz/${activeSession.quizId}/session/${activeSession.sessionId}`)}
          onCreateNew={() => deleteActiveSessionMutation.mutate(activeSession.sessionId)}
          isDeleting={deleteActiveSessionMutation.isPending}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {rateLimitMsg && (
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
          <p className="text-sm text-orange-700 font-bold">{rateLimitMsg}</p>
        </div>
      )}

      {/* Step 1: Select Category */}
      {!embedded && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-800">Bước 1: Chọn Danh Mục / Môn Học</h3>
          {catsLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-[#5D7B6F]" />
          ) : (
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="h-11 rounded-2xl border-2 border-slate-200 font-bold text-xs">
                <SelectValue placeholder="-- Chọn danh mục môn học --" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs font-bold py-2.5 rounded-xl cursor-pointer">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Step 2 & 3: Quizzes list & Start Action */}
      {selectedCategoryId && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800">Chọn tối thiểu 2 bài Quiz để trộn</h3>
            <span className="text-xs font-bold text-[#5D7B6F] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              Đã chọn: {selectedQuizIds.size} / 10
            </span>
          </div>

          {quizzesLoading ? (
            <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#5D7B6F] mx-auto" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {quizzes.map((q) => {
                const isChecked = selectedQuizIds.has(q.id)
                return (
                  <button
                    key={q.id}
                    onClick={() => toggleQuiz(q.id)}
                    className={cn(
                      'p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between',
                      isChecked
                        ? 'bg-[#5D7B6F]/10 border-[#5D7B6F] text-[#5D7B6F] shadow-xs'
                        : 'bg-slate-50 border-slate-200/70 text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-black line-clamp-1">{q.title}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{q.questionCount} câu hỏi</p>
                    </div>
                    <div className={cn('w-5 h-5 rounded-lg border flex items-center justify-center shrink-0', isChecked ? 'bg-[#5D7B6F] border-[#5D7B6F] text-white' : 'border-slate-300 bg-white')}>
                      {isChecked && '✓'}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Action Trigger */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button
              disabled={!canStart || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="bg-[#5D7B6F] hover:bg-[#4A6359] text-[#FFFFFF] font-black text-xs h-12 px-8 rounded-2xl shadow-md cursor-pointer"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shuffle className="w-4 h-4 mr-2" />}
              Bắt Đầu Tạo Quiz Trộn
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MixQuizTab
