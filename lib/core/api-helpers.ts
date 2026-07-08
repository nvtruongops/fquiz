import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import type { ZodError } from 'zod'

/**
 * Standard 400 response for failed Zod validation.
 */
export function validationErrorResponse(error: ZodError): NextResponse {
  return NextResponse.json(
    { error: 'Validation failed', details: error.issues },
    { status: 400 }
  )
}

/**
 * Parse a JSON request body, returning a 400 response on parse failure.
 * Usage:
 *   const body = await parseJsonBody(req)
 *   if (body instanceof NextResponse) return body
 */
export async function parseJsonBody(req: Request): Promise<unknown | NextResponse> {
  try {
    return await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
}

/**
 * Validate a MongoDB ObjectId, returning a 400 response if invalid.
 * Usage:
 *   const idCheck = invalidIdResponse(id)
 *   if (idCheck) return idCheck
 */
export function invalidIdResponse(id: string): NextResponse | null {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }
  return null
}
