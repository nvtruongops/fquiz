'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Map, CheckCircle2, BookOpen, Lock, Unlock, Compass, Loader2, Sparkles, ChevronRight, GraduationCap } from 'lucide-react'
import { Card, CardContent } from '@/components/shared/ui/card'
import { DevOnlyGuard } from '@/components/shared/DevOnlyGuard'
import { Badge } from '@/components/shared/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select'
import { Progress } from '@/components/shared/ui/progress'
import { cn } from '@/lib/core/utils/cn'

interface RoadmapLesson {
  lessonId: string
  title: string
  order: number
  status: 'locked' | 'available' | 'completed' | 'in_progress'
  prerequisitesCompleted: boolean
  completedPrerequisites: string[]
  missingPrerequisites: string[]
}

interface RoadmapModule {
  moduleId: string
  moduleTitle: string
  lessons: RoadmapLesson[]
}

interface RoadmapData {
  course: Record<string, unknown>
  roadmap: RoadmapModule[]
}

interface CourseItem {
  _id: string
  title: string
  code: string
  level?: string
}

const STATUS_CONFIG = {
  completed: {
    icon: CheckCircle2,
    bg: 'bg-success-bg/20 border-success-fg/30',
    iconBg: 'bg-success-fg text-white shadow-md shadow-success-fg/20',
    titleText: 'text-foreground',
    badge: 'bg-success-fg text-white border-none',
    label: 'Hoàn thành',
  },
  in_progress: {
    icon: BookOpen,
    bg: 'bg-amber-500/10 border-amber-500/30',
    iconBg: 'bg-amber-500 text-white shadow-md shadow-amber-500/20 animate-pulse',
    titleText: 'text-foreground',
    badge: 'bg-amber-500 text-white border-none',
    label: 'Đang học',
  },
  available: {
    icon: Unlock,
    bg: 'bg-primary/10 border-primary/30',
    iconBg: 'bg-primary text-primary-foreground shadow-md shadow-primary/20',
    titleText: 'text-foreground',
    badge: 'bg-primary text-primary-foreground border-none',
    label: 'Sẵn sàng',
  },
  locked: {
    icon: Lock,
    bg: 'bg-muted/60 border-border opacity-60',
    iconBg: 'bg-muted text-muted-foreground',
    titleText: 'text-muted-foreground',
    badge: 'bg-muted text-muted-foreground border-none',
    label: 'Chưa mở',
  },
}

export default function RoadmapPage() {
  const [courseId, setCourseId] = useState('')

  // Fetch available courses
  const { data: coursesData, isLoading: isCoursesLoading } = useQuery({
    queryKey: ['learning-courses'],
    queryFn: async () => {
      const res = await fetch('/api/v1/learning/course')
      if (!res.ok) return []
      const json = await res.json()
      return (Array.isArray(json) ? json : json.items || []) as CourseItem[]
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (coursesData && coursesData.length > 0 && !courseId) {
      setCourseId(coursesData[0]._id)
    }
  }, [coursesData, courseId])

  const { data, isLoading: isRoadmapLoading } = useQuery({
    queryKey: ['roadmap', courseId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/learning/course/${courseId}/roadmap`)
      if (!res.ok) throw new Error('Failed to load roadmap')
      return res.json() as Promise<RoadmapData>
    },
    enabled: courseId.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const courseTitle = data?.course && 'title' in data.course
    ? (data.course as any).title as string
    : 'Lộ Trình Học Ngôn Ngữ'

  // Calculate overall progress percentage
  const allLessons = data?.roadmap?.flatMap(m => m.lessons) || []
  const completedCount = allLessons.filter(l => l.status === 'completed').length
  const progressPercent = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0

  return (
    <DevOnlyGuard featureName="Lộ Trình Bài Học AI">
      <div className="w-full py-8 space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-[32px] bg-card backdrop-blur-2xl p-8 md:p-10 border border-border shadow-xs">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none transform-gpu" />
        
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">AI Learning Path</p>
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">Lộ Trình Học Ngôn Ngữ</h1>
            </div>
          </div>

          {/* Course Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
            <div className="w-full sm:w-72">
              <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-1.5">Chọn Khóa Học</label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="w-full h-12 rounded-2xl bg-card border-input font-bold text-foreground focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Chọn khóa học ngôn ngữ..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border bg-card shadow-xl">
                  {isCoursesLoading ? (
                    <div className="p-3 text-center text-xs text-muted-foreground font-bold">Đang tải danh sách...</div>
                  ) : coursesData && coursesData.length > 0 ? (
                    coursesData.map((c) => (
                      <SelectItem key={c._id} value={c._id} className="font-bold text-foreground rounded-xl cursor-pointer">
                        {c.title || c.code}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="demo" className="font-bold text-foreground">Khóa Học Ngôn Ngữ Căn Bản</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Overall Progress */}
            {allLessons.length > 0 && (
              <div className="flex-1 max-w-xs space-y-2 bg-muted/80 p-4 rounded-2xl border border-border">
                <div className="flex justify-between items-center text-xs font-black">
                  <span className="text-muted-foreground uppercase tracking-wider">Tiến độ tổng thể</span>
                  <span className="text-primary text-sm">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2.5 rounded-full bg-muted" />
                <p className="text-[10px] font-bold text-muted-foreground text-right">
                  {completedCount}/{allLessons.length} bài đã hoàn thành
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isRoadmapLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-xs font-black text-primary uppercase tracking-widest">Đang tải lộ trình học...</p>
        </div>
      )}

      {/* Roadmap Content */}
      {data && (
        <div className="space-y-10">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-black text-foreground tracking-tight uppercase">{courseTitle}</h2>
          </div>

          <div className="space-y-10 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-1 before:bg-border before:-z-0">
            {data.roadmap.map((mod, modIdx) => (
              <div key={mod.moduleId} className="relative z-10 space-y-4">
                {/* Module Header Badge */}
                <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/20 font-black text-xs uppercase tracking-wider">
                  <span>Module {modIdx + 1}</span>
                  <span className="opacity-40">•</span>
                  <span>{mod.moduleTitle}</span>
                </div>

                {/* Lessons List */}
                <div className="space-y-4 pl-3 sm:pl-8">
                  {mod.lessons.map((lesson) => {
                    const cfg = STATUS_CONFIG[lesson.status]
                    const Icon = cfg.icon

                    return (
                      <Card
                        key={lesson.lessonId}
                        className={cn(
                          "rounded-2xl border transition-all duration-300 backdrop-blur-xl shadow-sm hover:shadow-md",
                          cfg.bg
                        )}
                      >
                        <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", cfg.iconBg)}>
                            <Icon className="w-5 h-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className={cn("text-base font-black tracking-tight leading-snug", cfg.titleText)}>
                              {lesson.title}
                            </h4>
                            {lesson.status === 'locked' && lesson.missingPrerequisites.length > 0 && (
                              <p className="text-xs font-bold text-muted-foreground mt-1">
                                Cần hoàn thành {lesson.missingPrerequisites.length} bài học trước
                              </p>
                            )}
                          </div>

                          <Badge className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full shrink-0", cfg.badge)}>
                            {cfg.label}
                          </Badge>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!courseId && !isRoadmapLoading && (
        <div className="text-center py-16 px-4 bg-card backdrop-blur-2xl rounded-3xl border border-border max-w-md mx-auto space-y-3 shadow-xs">
          <Compass className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-base font-black text-foreground uppercase tracking-tight">Chọn khóa học để xem lộ trình</h3>
          <p className="text-xs font-semibold text-muted-foreground">Chọn một khóa học từ danh sách phía trên để theo dõi tiến độ bài học của bạn.</p>
        </div>
      )}
    </div>
    </DevOnlyGuard>
  )
}
