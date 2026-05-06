/**
 * Extracts a human-readable error message from various API error formats.
 * Handles Zod validation errors, flat error objects, and concurrency errors.
 * 
 * @param error The error object returned from the API
 * @returns A string representing the first or most relevant error message
 */
export function extractApiErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (Array.isArray(error)) return handleArrayError(error)
  if (!error || typeof error !== 'object') return 'Lưu thất bại'
  
  return handleObjectError(error as Record<string, unknown>)
}

function handleArrayError(error: unknown[]): string {
  const firstIssue = error[0] as { message?: unknown; path?: unknown[] } | undefined
  if (firstIssue && typeof firstIssue.message === 'string') {
    const path = Array.isArray(firstIssue.path) && firstIssue.path.length > 0 
      ? String(firstIssue.path.join('.')) 
      : ''
    return path ? `${path}: ${firstIssue.message}` : firstIssue.message
  }
  return 'Dữ liệu không hợp lệ'
}

function handleObjectError(flat: Record<string, unknown>): string {
  if (typeof flat.message === 'string') return flat.message
  if (typeof flat.error === 'string') return flat.error
  
  const fieldErrors = flat.fieldErrors as Record<string, string[] | undefined> | undefined
  const formErrors = flat.formErrors as string[] | undefined

  const fieldMessages = Object.values(fieldErrors ?? {})
    .flat()
    .filter((msg): msg is string => Boolean(msg))
  
  const formMessages = (formErrors ?? []).filter(Boolean)
  
  const all = [...fieldMessages, ...formMessages]
  return all.length > 0 ? all[0] : 'Lưu thất bại'
}
