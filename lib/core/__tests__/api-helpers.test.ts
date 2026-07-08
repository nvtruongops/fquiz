import { validationErrorResponse, parseJsonBody, invalidIdResponse } from '../api-helpers'
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
