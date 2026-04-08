/**
 * Client-side validation helpers
 * Validates data before sending to API to reduce unnecessary requests
 */

import { z, ZodTypeAny } from 'zod'

/**
 * Validates data against a Zod schema on the client side
 * Returns validation result with typed data or error details
 */
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

/**
 * Normalizes search input (trim, max length)
 */
export function normalizeSearchInput(input: string, maxLength = 200): string {
  return input.trim().slice(0, maxLength)
}

/**
 * Clamps pagination values to safe ranges
 */
export function clampPagination(page: number, limit: number): { page: number; limit: number } {
  return {
    page: Math.max(1, Math.min(page, 1000)),
    limit: Math.max(1, Math.min(limit, 100))
  }
}

/**
 * Validates file size and type for image uploads
 */
export function validateImageFile(file: File): { valid: true } | { valid: false; error: string } {
  const MAX_SIZE = 5 * 1024 * 1024 // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'Image must be less than 5MB' }
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, GIF, and WEBP images are allowed' }
  }
  
  return { valid: true }
}

/**
 * Converts File to base64 data URI
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Validates base64 image data URI
 */
export function validateBase64Image(dataUri: string): { valid: true } | { valid: false; error: string } {
  const MAX_SIZE = 5 * 1024 * 1024 // 5MB
  
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

/**
 * Sanitizes query parameters before building URL
 */
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
