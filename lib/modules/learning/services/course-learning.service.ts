import type { CourseRepository } from '@/lib/modules/learning/repositories/course.repository'
import type { ModuleRepository } from '@/lib/modules/learning/repositories/module.repository'
import type { LessonRepository } from '@/lib/modules/learning/repositories/lesson.repository'
import type { LearningProgressRepository } from '@/lib/modules/learning/repositories/learning-progress.repository'
import type { ICache } from '@/lib/core/cache'

export interface CourseStructure {
  course: Record<string, unknown>
  modules: Array<{
    module: Record<string, unknown>
    lessons: Array<{
      lesson: Record<string, unknown>
      progress?: { masteryLevel: number; completedAt?: Date | null }
    }>
  }>
}

/**
 * CourseLearningService — Orchestration cho việc xem cấu trúc khóa học.
 *
 * Gộp: Course → Modules → Lessons + Progress của user → cache.
 */
export class CourseLearningService {
  constructor(
    private courseRepo: CourseRepository,
    private moduleRepo: ModuleRepository,
    private lessonRepo: LessonRepository,
    private progressRepo: LearningProgressRepository,
    private cache: ICache,
  ) {}

  /** Lấy cấu trúc khóa học kèm tiến độ của user */
  async getCourseStructure(userId: string, courseId: string): Promise<CourseStructure | null> {
    const cacheKey = `course:structure:${courseId}:${userId}`
    const cached = await this.cache.get<CourseStructure>(cacheKey)
    if (cached) return cached

    const course = await this.courseRepo.findById(courseId)
    if (!course) return null

    const modules = await this.moduleRepo.findByCourse(courseId)
    const structure: CourseStructure = { course: course as any, modules: [] }

    // Collect all lesson IDs first for batch progress query
    const allLessons = []
    for (const mod of modules) {
      const lessons = await this.lessonRepo.findByModule(mod._id.toString())
      allLessons.push({ mod, lessons })
    }

    // Batch query all progress in one request
    const lessonProgressQueries = allLessons.flatMap(({ lessons }) =>
      lessons.map(l => ({
        learningObjectId: l._id.toString(),
        loType: 'lesson' as const,
        version: (l as any).contentVersion || 1,
      }))
    )
    const progressMap = await this.progressRepo.findByUserAndLOs(userId, lessonProgressQueries)

    for (const { mod, lessons } of allLessons) {
      const lessonEntries = []

      for (const lesson of lessons) {
        const key = `${lesson._id.toString()}:lesson:${(lesson as any).contentVersion || 1}`
        const progress = progressMap.get(key)
        lessonEntries.push({
          lesson: lesson as any,
          progress: progress ? {
            masteryLevel: progress.masteryLevel,
            completedAt: progress.completedAt || null,
          } : undefined,
        })
      }

      structure.modules.push({
        module: mod as any,
        lessons: lessonEntries,
      })
    }

    await this.cache.set(cacheKey, structure, 300, ['course', `course:${courseId}`, `user:${userId}`])
    return structure
  }

  /** Lấy roadmap tree với trạng thái khóa/mở dựa trên prerequisites */
  async getRoadmap(userId: string, courseId: string): Promise<CourseStructure & { roadmap: Array<{ moduleId: string; moduleTitle: string; lessons: Array<{ lessonId: string; title: string; order: number; status: 'locked' | 'available' | 'completed' | 'in_progress'; prerequisitesCompleted: boolean; completedPrerequisites: string[]; missingPrerequisites: string[] }> }> } | null> {
    const structure = await this.getCourseStructure(userId, courseId)
    if (!structure) return null

    const completedLessonIds = new Set<string>()
    for (const mod of structure.modules) {
      for (const entry of mod.lessons) {
        const lessonId = (entry.lesson as Record<string, unknown>)._id as string
        if (entry.progress?.completedAt && lessonId) {
          completedLessonIds.add(lessonId)
        }
      }
    }

    const roadmap = structure.modules.map((mod) => {
      const modData = mod.module as Record<string, unknown>
      const moduleId = modData._id as string ?? ''
      const moduleTitle = (modData.title as string) ?? ''

      const lessons = mod.lessons.map((entry) => {
        const lesson = entry.lesson as Record<string, unknown>
        const lessonId = lesson._id as string ?? ''
        const prereqs = (lesson.prerequisites ?? []) as string[]
        const completedPrerequisites = prereqs.filter((p: string) => completedLessonIds.has(p))
        const missingPrerequisites = prereqs.filter((p: string) => !completedLessonIds.has(p))

        let status: 'locked' | 'available' | 'completed' | 'in_progress' = 'available'

        if (entry.progress?.completedAt) {
          status = 'completed'
        } else if (entry.progress && entry.progress.masteryLevel > 0) {
          status = 'in_progress'
        } else if (missingPrerequisites.length > 0) {
          status = 'locked'
        }

        return {
          lessonId,
          title: (lesson.title as string) ?? '',
          order: (lesson.order as number) ?? 0,
          status,
          prerequisitesCompleted: missingPrerequisites.length === 0,
          completedPrerequisites,
          missingPrerequisites,
        }
      })

      return { moduleId, moduleTitle, lessons }
    })

    return {
      ...structure,
      roadmap,
    }
  }
}
