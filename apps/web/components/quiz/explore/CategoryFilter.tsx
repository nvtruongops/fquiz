'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, X, BookOpen, Layers, Pin, Loader2, BellRing, AlertCircle, RefreshCw } from 'lucide-react'
import { Input } from '@/components/shared/ui/input'
import { Card, CardContent } from '@/components/shared/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/shared/ui/dialog'
import { Checkbox } from '@/components/shared/ui/checkbox'
import { motion } from 'framer-motion'
import { useToast } from '@/store/shared/toast-store'
import { useAuthPrompt } from '@/store/shared/auth-prompt-store'
import { useAuth } from '@/hooks/auth/useAuth'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { cn } from '@/lib/core/utils/cn'

import { usePublicCategories, type CategoryItem } from '@/hooks/quiz/usePublicCategories'
import { CategoryGridSkeleton } from './ExploreSkeleton'

interface CategoryFilterProps {
  initialCategories?: CategoryItem[]
  initialPinnedCategories?: string[]
}

export default function CategoryFilter({ initialCategories, initialPinnedCategories }: CategoryFilterProps = {}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [pinningId, setPinningId] = useState<string | null>(null)
  const [notifyPromptCat, setNotifyPromptCat] = useState<{ id: string; name: string } | null>(null)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [enablingNotify, setEnablingNotify] = useState(false)
  const { toast } = useToast()
  const { openAuthPrompt } = useAuthPrompt()
  const { data: authData } = useAuth()
  const queryClient = useQueryClient()

  // Fetch public categories if not provided as initial data
  const {
    categories,
    isLoading: isLoadingCategories,
    isPending,
    isFetching,
    isSuccess,
    isError,
    refetch,
  } = usePublicCategories({
    initialData: initialCategories,
  })

  // We are waiting for categories if:
  // 1. Initial categories were not provided from server (undefined) and client hasn't loaded data yet
  // 2. Query is pending or actively loading initial data
  // 3. Query is fetching and we currently have 0 categories to display
  const isWaiting =
    categories.length === 0 &&
    !isError &&
    (
      (initialCategories === undefined && !isSuccess) ||
      isPending ||
      isLoadingCategories ||
      isFetching
    )

  // Fetch student pinned categories
  const { data: pinnedData } = useQuery({
    queryKey: ['student', 'pinned-categories'],
    queryFn: async () => {
      const res = await fetch('/api/student/pinned-categories')
      if (!res.ok) return { pinnedCategories: [] }
      return res.json() as Promise<{ pinnedCategories: string[] }>
    },
    initialData: initialPinnedCategories ? { pinnedCategories: initialPinnedCategories } : undefined,
    enabled: Boolean(authData?.user),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const pinnedSet = useMemo(() => new Set(pinnedData?.pinnedCategories || []), [pinnedData?.pinnedCategories])

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
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 401) {
          openAuthPrompt({
            featureName: 'Pin Course',
            title: 'Sign in to pin course',
            description: 'Pinning a course helps you quickly access and track progress on your favorite quizzes.',
            targetUrl: '/explore',
          })
          return
        }
        toast.error(json.error || 'Failed to pin category')
      } else {
        queryClient.setQueryData(['student', 'pinned-categories'], { pinnedCategories: json.pinnedCategories })
        toast.success(json.pinned ? 'Pinned category to top' : 'Unpinned category')

        if (json.pinned) {
          try {
            const dismissed: string[] = JSON.parse(localStorage.getItem('fquiz_dismissed_pin_notif_cats') || '[]')
            if (!dismissed.includes(categoryId)) {
              const catObj = categories.find((c) => c.id === categoryId)
              if (catObj) {
                setNotifyPromptCat({ id: catObj.id, name: catObj.name })
                setDontShowAgain(false)
              }
            }
          } catch {
            // ignore localStorage error
          }
        }
      }
    } catch {
      toast.error('An error occurred while pinning category')
    } finally {
      setPinningId(null)
    }
  }

  const handleCloseModal = () => {
    if (dontShowAgain && notifyPromptCat) {
      try {
        const dismissed: string[] = JSON.parse(localStorage.getItem('fquiz_dismissed_pin_notif_cats') || '[]')
        if (!dismissed.includes(notifyPromptCat.id)) {
          dismissed.push(notifyPromptCat.id)
          localStorage.setItem('fquiz_dismissed_pin_notif_cats', JSON.stringify(dismissed))
        }
      } catch {
        // ignore localStorage error
      }
    }
    setNotifyPromptCat(null)
  }

  const handleEnableNotifications = async () => {
    setEnablingNotify(true)
    try {
      const res = await fetch('/api/student/settings', {
        method: 'PATCH',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          notify_email: true,
          notify_quiz_reminder: true,
        }),
      })
      if (res.ok) {
        toast.success(`Enabled email notifications for ${notifyPromptCat?.name || ''}`)
      } else {
        toast.error('Failed to update notification settings')
      }
    } catch {
      toast.error('An error occurred while enabling notifications')
    } finally {
      setEnablingNotify(false)
      handleCloseModal()
    }
  }

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sortedAndFiltered = [...filtered].sort((a, b) => {
    const aPinned = pinnedSet.has(a.id)
    const bPinned = pinnedSet.has(b.id)
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
        className="mb-4 sm:mb-8 relative max-w-xl mx-auto w-full px-2 sm:px-0"
      >
        <div className="relative group">
          {/* Subtle Glow Behind Input */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-primary/10 rounded-full blur-md opacity-30 group-hover:opacity-60 transition duration-500"></div>

          <div className="relative flex items-center">
            <Search className="absolute left-3.5 sm:left-4 text-primary h-4 w-4 pointer-events-none" aria-hidden="true" />
            <Input
              placeholder="Search courses, study categories..."
              className="w-full h-10 sm:h-12 pl-10 sm:pl-11 pr-12 text-xs sm:text-sm border border-input bg-card/90 backdrop-blur-xl rounded-full shadow-xs focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200 placeholder:text-muted-foreground font-medium text-foreground"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                aria-label="Clear search"
                title="Clear search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {isWaiting ? (
        <CategoryGridSkeleton count={8} />
      ) : isError && categories.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 sm:py-16 px-4 bg-card/60 backdrop-blur-2xl rounded-3xl border border-destructive/30 shadow-sm max-w-md mx-auto"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-3 text-destructive">
            <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true" />
          </div>
          <h3 className="text-sm sm:text-base font-black text-card-foreground uppercase tracking-tight">Unable to load courses</h3>
          <p className="text-xs font-semibold text-muted-foreground mt-1 mb-4">An error occurred while connecting to the server. Please try again.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Try again
          </button>
        </motion.div>
      ) : sortedAndFiltered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 w-full">
          {sortedAndFiltered.map((cat) => {
            const isPinned = pinnedSet.has(cat.id)
            return (
              <motion.div
                key={cat.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <div
                  className={cn(
                    'group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border bg-card/90 backdrop-blur-xl transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] overflow-hidden',
                    isPinned
                      ? 'border-question-flagged-border/80 bg-card shadow-xs ring-1 ring-question-flagged-border/40'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  {/* Subtle inner highlight */}
                  <div className="absolute inset-0 border border-border/20 rounded-2xl sm:rounded-3xl pointer-events-none opacity-40"></div>

                  <Link
                    href={`/courses/${encodeURIComponent(cat.name.toLowerCase())}`}
                    className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1 outline-none mr-2"
                  >
                    {/* Course Icon Container */}
                    <div
                      className={cn(
                        'w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-200 shadow-2xs',
                        isPinned
                          ? 'bg-question-flagged-bg text-question-flagged-fg border-question-flagged-border'
                          : 'bg-primary/10 text-primary border-primary/15 group-hover:bg-primary/20 group-hover:scale-105'
                      )}
                    >
                      <BookOpen className="w-5 h-5 transition-transform duration-200" aria-hidden="true" />
                    </div>

                    {/* Text Details */}
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm sm:text-base font-black text-foreground uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                        {cat.name}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-muted-foreground mt-0.5">
                        <Layers className="w-3 h-3 text-muted-foreground/70 shrink-0" aria-hidden="true" />
                        <span>{cat.quizCount || 0} quizzes</span>
                      </span>
                    </div>
                  </Link>

                  {/* Pin Action Button */}
                  <button
                    type="button"
                    onClick={(e) => handleTogglePin(e, cat.id)}
                    disabled={pinningId === cat.id}
                    aria-label={isPinned ? `Unpin ${cat.name}` : `Pin ${cat.name}`}
                    className={cn(
                      'min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 border active:scale-90',
                      isPinned
                        ? 'bg-question-flagged-bg text-question-flagged-fg border-question-flagged-border shadow-xs hover:opacity-80'
                        : 'bg-muted/50 text-muted-foreground hover:text-question-flagged-fg hover:bg-muted border-border/40 hover:border-question-flagged-border/50'
                    )}
                    title={isPinned ? 'Unpin category' : 'Pin category to top'}
                  >
                    {pinningId === cat.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Pin className={cn('w-4 h-4', isPinned && 'fill-current')} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 sm:py-16 px-4 bg-card/60 backdrop-blur-2xl rounded-3xl border border-border shadow-sm max-w-md mx-auto"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
            <Search className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true" />
          </div>
          <h3 className="text-sm sm:text-base font-black text-card-foreground uppercase tracking-tight">
            {searchTerm ? 'No courses found' : 'No courses available'}
          </h3>
          <p className="text-xs font-semibold text-muted-foreground mt-1">
            {searchTerm
              ? `No results matching "${searchTerm}".`
              : 'Course catalog is being updated.'}
          </p>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-colors cursor-pointer"
            >
              Clear search filter
            </button>
          )}
        </motion.div>
      )}

      {/* Notification Prompt Modal */}
      <Dialog open={!!notifyPromptCat} onOpenChange={(open) => { if (!open) handleCloseModal() }}>
        <DialogContent className="sm:max-w-md rounded-3xl border border-border p-6 bg-card text-card-foreground shadow-2xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-1">
              <BellRing className="w-6 h-6" aria-hidden="true" />
            </div>
            <DialogTitle className="text-lg font-black text-card-foreground">
              Enable email notifications for {notifyPromptCat?.name}?
            </DialogTitle>
            <DialogDescription asChild className="text-xs text-muted-foreground font-medium">
              <div className="space-y-1.5 pt-1 text-center">
                <p>
                  You just pinned <strong className="text-card-foreground font-extrabold">{notifyPromptCat?.name}</strong>.
                </p>
                <p className="text-muted-foreground font-semibold">
                  Would you like to receive automatic email notifications whenever new quizzes are added to this course?
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 flex items-center space-x-2 border-t border-b border-border my-2">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(!!checked)}
            />
            <label htmlFor="dont-show-again" className="text-xs font-bold text-muted-foreground cursor-pointer select-none">
              Do not show again for this category
            </label>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="w-full sm:w-1/2 min-h-[44px] px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer flex items-center justify-center"
            >
              Maybe later / Skip
            </button>
            <button
              type="button"
              onClick={handleEnableNotifications}
              disabled={enablingNotify}
              className="w-full sm:w-1/2 min-h-[44px] px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {enablingNotify ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <BellRing className="w-4 h-4" aria-hidden="true" />}
              Enable email notifications
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
