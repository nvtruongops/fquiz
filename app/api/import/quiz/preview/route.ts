import { NextResponse } from 'next/server'
import { buildQuizImportPreview } from '@/lib/quiz-import'
import { requireRole, verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Category } from '@/models/Category'
import { Types } from 'mongoose'

const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['.json', '.txt']

function hasAllowedExtension(filename: string): boolean {
  const lower = filename.toLowerCase()
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

async function parseRequestPayload(req: Request): Promise<unknown> {
  const contentType = req.headers.get('content-type')?.toLowerCase() ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      throw new Error('MISSING_FILE')
    }

    if (!hasAllowedExtension(file.name)) {
      throw new Error('INVALID_FILE_TYPE')
    }
    if (file.size > MAX_IMPORT_FILE_SIZE) {
      throw new Error('FILE_TOO_LARGE')
    }

    const content = await file.text()
    if (content.length > MAX_IMPORT_FILE_SIZE) {
      throw new Error('FILE_TOO_LARGE')
    }

    return content
  }

  const textBody = await req.text()
  if (!textBody.trim()) {
    throw new Error('EMPTY_BODY')
  }
  if (textBody.length > MAX_IMPORT_FILE_SIZE) {
    throw new Error('FILE_TOO_LARGE')
  }

  return textBody
}

export async function POST(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (payload.role !== 'admin' && payload.role !== 'student') {
      requireRole(payload, 'admin')
    }

    const input = await parseRequestPayload(req)
    const preview = buildQuizImportPreview(input)
    await connectDB()

    const categoryToken = preview.normalizedQuiz.category_id?.trim()
    if (categoryToken) {
      const categoryMatch = await findCategoryForImport(categoryToken, payload.role, payload.userId)
      if (!categoryMatch.found) {
        preview.diagnostics.push({
          level: 'error',
          code: 'CATEGORY_NOT_FOUND',
          message: `Không tìm thấy category_id "${categoryToken}". Vui lòng tạo môn học trước khi lưu quiz.`,
          field: 'quizMeta.category_id',
        })
        preview.summary.errors += 1
        preview.isValid = false
      } else {
        preview.normalizedQuiz.category_id = categoryMatch.categoryId
        preview.diagnostics = preview.diagnostics.filter(
          (item) => !(item.code === 'CATEGORY_ID_NOT_OBJECT_ID' && item.field === 'quizMeta.category_id')
        )
        preview.summary.warnings = preview.diagnostics.filter((item) => item.level === 'warning').length
      }
    }
    if (!preview.isValid) {
      const topCodes = preview.diagnostics
        .filter((item) => item.level === 'error')
        .map((item) => item.code)
        .slice(0, 5)
      console.warn('Quiz import preview validation errors', {
        role: payload.role,
        errorCount: preview.summary.errors,
        topCodes,
      })
    }

    return NextResponse.json(preview)
  } catch (err) {
    if (err instanceof Response) return err
    if (err instanceof Error) {
      switch (err.message) {
        case 'MISSING_FILE':
          return NextResponse.json({ error: 'Thiếu file upload (field "file")' }, { status: 400 })
        case 'INVALID_FILE_TYPE':
          return NextResponse.json({ error: 'Chỉ cho phép file .json hoặc .txt' }, { status: 400 })
        case 'FILE_TOO_LARGE':
          return NextResponse.json({ error: 'File quá lớn (tối đa 2MB)' }, { status: 413 })
        case 'EMPTY_BODY':
          return NextResponse.json({ error: 'Nội dung request đang trống' }, { status: 400 })
        case 'INVALID_JSON':
          return NextResponse.json({ error: 'Nội dung JSON không hợp lệ' }, { status: 400 })
        case 'INVALID_PAYLOAD_SHAPE':
          return NextResponse.json({ error: 'Payload phải là một JSON object' }, { status: 400 })
      }
    }

    console.error('Quiz import preview error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function findCategoryForImport(
  categoryToken: string,
  role: string,
  userId: string
): Promise<{ found: boolean; categoryId?: string }> {
  const byId = Types.ObjectId.isValid(categoryToken)
  const baseQuery: Record<string, unknown> = byId
    ? { _id: new Types.ObjectId(categoryToken) }
    : { name: { $regex: `^${escapeRegex(categoryToken)}$`, $options: 'i' } }

  if (role === 'admin') {
    const found = await Category.findOne({
      ...baseQuery,
      type: 'public',
      status: 'approved',
    })
      .select('_id')
      .lean()
    return found ? { found: true, categoryId: String((found as any)._id) } : { found: false }
  }

  const found = await Category.findOne({
    ...baseQuery,
    ...(Types.ObjectId.isValid(userId) ? { owner_id: new Types.ObjectId(userId) } : { owner_id: userId }),
    type: 'private',
  })
    .select('_id')
    .lean()
  return found ? { found: true, categoryId: String((found as any)._id) } : { found: false }
}
