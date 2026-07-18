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
    bg: 'bg-emerald-50/90 border-emerald-200/80',
    iconBg: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20',
    titleText: 'text-slate-900',
    badge: 'bg-emerald-500 text-white border-none',
    label: 'Hoàn thành',
  },
  in_progress: {
    icon: BookOpen,
    bg: 'bg-amber-50/90 border-amber-200/80',
    iconBg: 'bg-amber-500 text-white shadow-md shadow-amber-500/20 animate-pulse',
    titleText: 'text-slate-900',
    badge: 'bg-amber-500 text-white border-none',
    label: 'Đang học',
  },
  available: {
    icon: Unlock,
    bg: 'bg-blue-50/90 border-blue-200/80',
    iconBg: 'bg-blue-500 text-white shadow-md shadow-blue-500/20',
    titleText: 'text-slate-900',
    badge: 'bg-blue-500 text-white border-none',
    label: 'Sẵn sàng',
  },
  locked: {
    icon: Lock,
    bg: 'bg-slate-100/60 border-slate-200/60 opacity-60',
    iconBg: 'bg-slate-300 text-slate-600',
    titleText: 'text-slate-500',
    badge: 'bg-slate-200 text-slate-600 border-none',
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
      <div className="relative overflow-hidden rounded-[32px] bg-white/80 backdrop-blur-2xl p-8 md:p-10 border border-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#5D7B6F]/10 via-[#A4C3A2]/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#5D7B6F]/10 text-[#5D7B6F] flex items-center justify-center font-bold">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#5D7B6F]">AI Learning Path</p>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Lộ Trình Học Ngôn Ngữ</h1>
            </div>
          </div>

          {/* Course Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
            <div className="w-full sm:w-72">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">Chọn Khóa Học</label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="w-full h-12 rounded-2xl bg-white/90 border-slate-200 font-bold text-slate-800 focus:ring-2 focus:ring-[#5D7B6F]/20">
                  <SelectValue placeholder="Chọn khóa học ngôn ngữ..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 bg-white shadow-xl">
                  {isCoursesLoading ? (
                    <div className="p-3 text-center text-xs text-slate-400 font-bold">Đang tải danh sách...</div>
                  ) : coursesData && coursesData.length > 0 ? (
                    coursesData.map((c) => (
                      <SelectItem key={c._id} value={c._id} className="font-bold text-slate-800 rounded-xl cursor-pointer">
                        {c.title || c.code}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="demo" className="font-bold text-slate-800">Khóa Học Ngôn Ngữ Căn Bản</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Overall Progress */}
            {allLessons.length > 0 && (
              <div className="flex-1 max-w-xs space-y-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center text-xs font-black">
                  <span className="text-slate-500 uppercase tracking-wider">Tiến độ tổng thể</span>
                  <span className="text-[#5D7B6F] text-sm">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2.5 rounded-full bg-slate-200" />
                <p className="text-[10px] font-bold text-slate-400 text-right">
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
          <Loader2 className="w-10 h-10 text-[#5D7B6F] animate-spin" />
          <p className="text-xs font-black text-[#5D7B6F] uppercase tracking-widest">Đang tải lộ trình học...</p>
        </div>
      )}

      {/* Roadmap Content */}
      {data && (
        <div className="space-y-10">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-6 h-6 text-[#5D7B6F]" />
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">{courseTitle}</h2>
          </div>

          <div className="space-y-10 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-1 before:bg-slate-200/80 before:-z-0">
            {data.roadmap.map((mod, modIdx) => (
              <div key={mod.moduleId} className="relative z-10 space-y-4">
                {/* Module Header Badge */}
                <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20 font-black text-xs uppercase tracking-wider">
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
                              <p className="text-xs font-bold text-slate-400 mt-1">
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
        <div className="text-center py-16 px-4 bg-white/60 backdrop-blur-2xl rounded-3xl border border-white/80 max-w-md mx-auto space-y-3">
          <Compass className="w-12 h-12 text-[#5D7B6F]/40 mx-auto" />
          <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Chọn khóa học để xem lộ trình</h3>
          <p className="text-xs font-semibold text-slate-400">Chọn một khóa học từ danh sách phía trên để theo dõi tiến độ bài học của bạn.</p>
        </div>
      )}
    </div>
    </DevOnlyGuard>
  )
}
