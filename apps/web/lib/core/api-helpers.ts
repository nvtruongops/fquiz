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

export class BodyTooLargeError extends Error {
  constructor() {
    super('Request body exceeds the configured byte limit')
    this.name = 'BodyTooLargeError'
  }
}

/** Read at most maxBytes from a request stream, cancelling it on overflow. */
export async function readBoundedBody(req: Request, maxBytes: number): Promise<Uint8Array> {
  const contentLength = Number(req.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    await req.body?.cancel()
    throw new BodyTooLargeError()
  }

  if (!req.body) return new Uint8Array()

  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        await reader.cancel()
        throw new BodyTooLargeError()
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const body = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
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
