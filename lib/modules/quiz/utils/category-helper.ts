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

  let category = await Category.findOne({
    name: { $regex: new RegExp(`^${escapedCode}$`, 'i') },
  }).lean() as any

  if (!category) {
    category = await Category.create({
      name: cleanCode,
      description: `Danh mục môn học ${cleanCode}`,
      type: 'public',
      is_public: true,
      status: 'approved',
      ...(userId ? { owner_id: new Types.ObjectId(userId) } : {}),
    })
  }

  return category
}
