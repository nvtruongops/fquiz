import { NextResponse } from 'next/server'
import { buildQuizImportPreview } from '@/lib/modules/quiz/quiz-import'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { Category } from '@/lib/modules/quiz/models/Category'
import { Types } from 'mongoose'
import { BodyTooLargeError, readBoundedBody } from '@/lib/core/api-helpers'

const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024
const MAX_MULTIPART_OVERHEAD_BYTES = 64 * 1024
const ALLOWED_EXTENSIONS = ['.json', '.txt']

function hasAllowedExtension(filename: string): boolean {
  const lower = filename.toLowerCase()
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

async function parseRequestPayload(req: Request): Promise<unknown> {
  const contentType = req.headers.get('content-type')?.toLowerCase() ?? ''
  const isMultipart = contentType.includes('multipart/form-data')
  let bytes: Uint8Array
  try {
    bytes = await readBoundedBody(
      req,
      MAX_IMPORT_FILE_SIZE + (isMultipart ? MAX_MULTIPART_OVERHEAD_BYTES : 0),
    )
  } catch (error) {
    if (error instanceof BodyTooLargeError) throw new Error('FILE_TOO_LARGE')
    throw error
  }

  if (isMultipart) {
    const boundedRequest = new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    })
    const formData = await boundedRequest.formData()
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

    return new TextDecoder().decode(await file.arrayBuffer())
  }

  const textBody = new TextDecoder().decode(bytes)
  if (!textBody.trim()) {
    throw new Error('EMPTY_BODY')
  }

  return textBody
}

export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    const url = new URL(req.url)
    const context = {
      category_id: url.searchParams.get('category_id') || undefined,
      course_code: url.searchParams.get('course_code') || undefined,
      description: url.searchParams.get('description') || undefined,
    }

    const input = await parseRequestPayload(req)
    const preview = buildQuizImportPreview(input, context)
    await connectDB()

    const categoryToken = preview.normalizedQuiz.category_id?.trim()
    if (categoryToken) {
      const categoryMatch = await findCategoryForImport(categoryToken, payload.role, payload.userId)
      if (!categoryMatch.found) {
        preview.diagnostics.push({
          level: 'error',
          code: 'CATEGORY_NOT_FOUND',
          message: `Category "${categoryToken}" not found. Please create the category before saving the quiz.`,
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
          return NextResponse.json({ error: 'Missing file upload (field "file")' }, { status: 400 })
        case 'INVALID_FILE_TYPE':
          return NextResponse.json({ error: 'Only .json or .txt files are allowed' }, { status: 400 })
        case 'FILE_TOO_LARGE':
          return NextResponse.json({ error: 'File is too large (maximum 2MB)' }, { status: 413 })
        case 'EMPTY_BODY':
          return NextResponse.json({ error: 'Request body is empty' }, { status: 400 })
        case 'INVALID_JSON':
          return NextResponse.json({ error: 'Invalid JSON content' }, { status: 400 })
        case 'INVALID_PAYLOAD_SHAPE':
          return NextResponse.json({ error: 'Payload must be a JSON object' }, { status: 400 })
      }
    }

    console.error('Quiz import preview error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['teacher'] })

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
