'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

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

const STATUS_CONFIG = {
  completed: { icon: '✅', bg: 'bg-green-500/10 border-green-500/30', text: 'text-green-400' },
  in_progress: { icon: '📖', bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-400' },
  available: { icon: '🔓', bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400' },
  locked: { icon: '🔒', bg: 'bg-gray-800 border-gray-700', text: 'text-gray-500' },
}

export default function RoadmapPage() {
  const [courseId, setCourseId] = useState('')

  const { data, isLoading } = useQuery({
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
    : 'Course Roadmap'

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Learning Roadmap</h1>

      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Course ID</label>
        <input
          type="text"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          placeholder="Enter course ID to view roadmap..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm"
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      )}

      {data && (
        <div>
          <h2 className="text-xl font-semibold mb-6">{courseTitle}</h2>

          <div className="space-y-8">
            {data.roadmap.map((mod) => (
              <div key={mod.moduleId} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-medium mb-4">{mod.moduleTitle}</h3>

                <div className="space-y-3">
                  {mod.lessons.map((lesson) => {
                    const cfg = STATUS_CONFIG[lesson.status]
                    return (
                      <div
                        key={lesson.lessonId}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${cfg.bg}`}
                      >
                        <div className="text-xl">{cfg.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium ${cfg.text}`}>
                            {lesson.title}
                          </div>
                          {lesson.status === 'locked' && lesson.missingPrerequisites.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Requires {lesson.missingPrerequisites.length} prerequisite lesson(s)
                            </div>
                          )}
                          {lesson.status === 'in_progress' && (
                            <div className="text-xs text-yellow-500 mt-1">In progress</div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {lesson.status === 'completed' ? 'Completed' :
                           lesson.status === 'available' ? 'Start' :
                           lesson.status === 'locked' ? 'Locked' : 'Continue'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!courseId && !isLoading && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-4">🗺️</div>
          <p>Enter a Course ID above to view your learning roadmap.</p>
        </div>
      )}
    </div>
  )
}
