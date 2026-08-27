import { Category } from '@/lib/modules/quiz/models/Category'
import { Types } from 'mongoose'

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Ensures a Category exists for a given course code.
 * If not found by name (case-insensitive), automatically creates it.
 */
export async function ensureCategoryForCourseCode(
  courseCode: string,
  userId?: string | Types.ObjectId
): Promise<any> {
  if (!courseCode || typeof courseCode !== 'string' || !courseCode.trim()) {
    return null
  }

  const cleanCode = courseCode.trim().toUpperCase()
  const escapedCode = escapeRegex(cleanCode)

  // 1. Look for public category matching this name
  let category = (await Category.findOne({
    // eslint-disable-next-line security/detect-non-literal-regexp
    name: { $regex: new RegExp(`^${escapedCode}$`, 'i') },
    $or: [{ type: 'public' }, { is_public: true }, { owner_id: null }],
  }).lean()) as any

  // 2. Fallback to any category matching this name
  if (!category) {
    category = (await Category.findOne({
      // eslint-disable-next-line security/detect-non-literal-regexp
      name: { $regex: new RegExp(`^${escapedCode}$`, 'i') },
    }).lean()) as any
  }

  // 3. Create public category by default if missing
  if (!category) {
    category = await Category.create({
      name: cleanCode,
      description: `Danh mục môn học ${cleanCode}`,
      type: 'public',
      is_public: true,
      status: 'approved',
      owner_id: null,
    })
  }

  return category
}
