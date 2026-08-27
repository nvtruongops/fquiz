import { Category } from '@/lib/modules/quiz/models/Category' // ponytail: allow-cross-module

export interface SubjectIdentifier {
  categoryId: string
  canonicalCourseCode: string
  sourceCourseCode?: string
}

export interface SubjectContext {
  categoryId: string
  canonicalCourseCode: string
  displayCourseCode?: string
  categoryName?: string
}

export class SubjectResolver {
  /**
   * Resolves the authoritative SubjectContext from a Quiz document and its Category.
   * 
   * Principles:
   * 1. category_id is the authoritative subject identity in the database.
   * 2. No naive regex truncation (e.g. AI_101 must NEVER be trimmed to AI).
   * 3. canonicalCourseCode is authoritative identity; displayCourseCode preserves raw user-facing code.
   */
  static async resolve(quizDoc: {
    category_id?: any
    course_code?: string
  }): Promise<SubjectContext> {
    const rawDisplayCode = (quizDoc.course_code || '').trim().toUpperCase()
    const categoryId = quizDoc.category_id ? quizDoc.category_id.toString() : ''

    let categoryName = ''
    let canonicalCourseCode = rawDisplayCode

    if (categoryId) {
      try {
        const catRes = Category.findById(categoryId) as any
        const catDoc = catRes && typeof catRes.select === 'function'
          ? (await catRes.select('name').lean()) as any
          : null

        if (catDoc?.name) {
          categoryName = catDoc.name.trim()
          // If category name matches standard alphanumeric course code format (e.g. "PMG201C"), it serves as canonical
          if (/^[A-Z]{2,6}\d{2,4}[A-Z]?$/i.test(categoryName)) {
            canonicalCourseCode = categoryName.toUpperCase()
          }
        }
      } catch {
        // Fallback gracefully without breaking if Category fetch fails
      }
    }

    return {
      categoryId,
      canonicalCourseCode: canonicalCourseCode || rawDisplayCode || 'UNKNOWN',
      displayCourseCode: rawDisplayCode,
      categoryName: categoryName || undefined,
    }
  }

  /**
   * Deterministically checks if two subject contexts represent the same authoritative subject.
   */
  static isSameSubject(a: Partial<SubjectContext>, b: Partial<SubjectContext>): boolean {
    const isSameCategory = Boolean(a.categoryId && b.categoryId && a.categoryId === b.categoryId)
    const isSameCode = Boolean(
      a.canonicalCourseCode &&
      b.canonicalCourseCode &&
      a.canonicalCourseCode.toUpperCase() === b.canonicalCourseCode.toUpperCase()
    )
    return isSameCategory || isSameCode
  }
}
