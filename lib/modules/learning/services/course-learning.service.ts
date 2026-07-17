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

    for (const mod of modules) {
      const lessons = await this.lessonRepo.findByModule(mod._id.toString())
      const lessonEntries = []

      for (const lesson of lessons) {
        const progress = await this.progressRepo.findByUserAndLO(
          userId, lesson._id.toString(), 'lesson', lesson.contentVersion || 1
        )
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
}
