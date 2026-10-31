import { BodyTooLargeError, readBoundedBody, validationErrorResponse, parseJsonBody, invalidIdResponse } from '../api-helpers'
import { NextResponse } from 'next/server'

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn().mockImplementation((body, init) => ({
      body,
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}))

describe('validationErrorResponse', () => {
  it('should return 400 response with validation error details', () => {
    const error = {
      issues: [
        { path: ['name'], message: 'Required', code: 'invalid_type' },
        { path: ['email'], message: 'Invalid email', code: 'invalid_string' },
      ],
      name: 'ZodError',
    } as any

    const response = validationErrorResponse(error)
    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'Validation failed',
      details: error.issues,
    })
  })
})

describe('parseJsonBody', () => {
  it('should parse valid JSON body', async () => {
    const req = {
      json: jest.fn().mockResolvedValue({ name: 'test', value: 123 }),
    } as unknown as Request

    const result = await parseJsonBody(req)
    expect(result).toEqual({ name: 'test', value: 123 })
  })

  it('should return 400 response for invalid JSON', async () => {
    const req = {
      json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
    } as unknown as Request

    const result = await parseJsonBody(req)
    expect((result as NextResponse).status).toBe(400)
    expect((result as any).body).toEqual({ error: 'Invalid JSON body' })
  })
})

describe('readBoundedBody', () => {
  const requestWithBody = (body: BodyInit, headers?: HeadersInit) => new Request('https://example.test', {
    method: 'POST',
    body,
    headers,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' })

  it('accepts a body whose UTF-8 byte length is exactly at the limit', async () => {
    const response = new Response('é')
    const bytes = await readBoundedBody(requestWithBody(response.body!), 2)
    expect(new TextDecoder().decode(bytes)).toBe('é')
  })

  it('rejects an oversized chunked body with no Content-Length', async () => {
    const request = requestWithBody(new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(4))
        },
      }))

    await expect(readBoundedBody(request, 3)).rejects.toBeInstanceOf(BodyTooLargeError)
  })

  it('cancels a stream when a falsely small Content-Length exceeds the byte limit', async () => {
    let chunksRead = 0
    let wasCancelled = false
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        chunksRead += 1
        if (chunksRead <= 2) controller.enqueue(new Uint8Array(2))
        else controller.enqueue(new Uint8Array(1))
      },
      cancel() {
        wasCancelled = true
      },
    }, { highWaterMark: 0 })
    const request = requestWithBody(stream, { 'content-length': '1' })

    await expect(readBoundedBody(request, 3)).rejects.toBeInstanceOf(BodyTooLargeError)
    expect(wasCancelled).toBe(true)
    expect(chunksRead).toBe(2)
  })
})

describe('invalidIdResponse', () => {
  it('should return null for valid MongoDB ObjectId', () => {
    const result = invalidIdResponse('507f1f77bcf86cd799439011')
    expect(result).toBeNull()
  })

  it('should return 400 response for invalid ID', () => {
    const result = invalidIdResponse('invalid-id')
    expect(result).not.toBeNull()
    expect((result as NextResponse).status).toBe(400)
    expect((result as any).body).toEqual({ error: 'Invalid ID' })
  })

  it('should return 400 for empty string', () => {
    const result = invalidIdResponse('')
    expect(result).not.toBeNull()
    expect((result as NextResponse).status).toBe(400)
  })
})
