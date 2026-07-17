import { z, ZodTypeAny } from 'zod'

export function validateClientData<T extends ZodTypeAny>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: string[] } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const errors = result.error.issues.map(issue => {
    const path = issue.path.join('.')
    return path ? `${path}: ${issue.message}` : issue.message
  })
  return { success: false, errors }
}

export function normalizeSearchInput(input: string, maxLength = 200): string {
  return input.trim().slice(0, maxLength)
}

export function clampPagination(page: number, limit: number): { page: number; limit: number } {
  return {
    page: Math.max(1, Math.min(page, 1000)),
    limit: Math.max(1, Math.min(limit, 100)),
  }
}

export function sanitizeQueryParams(params: Record<string, unknown>): Record<string, string> {
  const sanitized: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') {
      continue
    }
    if (typeof value === 'string') {
      sanitized[key] = value.trim()
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = String(value)
    }
  }
  return sanitized
}

export function validateBase64Image(dataUri: string): { valid: true } | { valid: false; error: string } {
  const MAX_SIZE = 5 * 1024 * 1024
  const match = dataUri.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,(.+)$/i)
  if (!match) {
    return { valid: false, error: 'Invalid image format' }
  }
  const base64 = match[2]
  const sizeInBytes = Math.floor((base64.length * 3) / 4)
  if (sizeInBytes > MAX_SIZE) {
    return { valid: false, error: 'Image must be less than 5MB' }
  }
  return { valid: true }
}
