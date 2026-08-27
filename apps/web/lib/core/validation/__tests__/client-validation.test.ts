import { normalizeSearchInput, clampPagination, validateBase64Image, sanitizeQueryParams, validateClientData } from '../client-validation'
import { z } from 'zod'

describe('normalizeSearchInput', () => {
  it('should trim whitespace', () => {
    expect(normalizeSearchInput('  hello  ')).toBe('hello')
  })
  it('should truncate to maxLength', () => {
    expect(normalizeSearchInput('abcde', 3)).toBe('abc')
  })
  it('should return empty for empty input', () => {
    expect(normalizeSearchInput('')).toBe('')
  })
  it('should handle default maxLength (200)', () => {
    expect(normalizeSearchInput('x'.repeat(250)).length).toBe(200)
  })
})

describe('clampPagination', () => {
  it('should clamp low values to 1', () => {
    expect(clampPagination(0, 0)).toEqual({ page: 1, limit: 1 })
    expect(clampPagination(-5, -10)).toEqual({ page: 1, limit: 1 })
  })
  it('should clamp high page to 1000, limit to 100', () => {
    expect(clampPagination(2000, 200)).toEqual({ page: 1000, limit: 100 })
  })
  it('should pass through valid values', () => {
    expect(clampPagination(5, 20)).toEqual({ page: 5, limit: 20 })
  })
})

describe('validateBase64Image', () => {
  it('should validate valid JPEG base64', () => {
    const dataUri = 'data:image/jpeg;base64,' + Buffer.from('x').toString('base64')
    expect(validateBase64Image(dataUri).valid).toBe(true)
  })
  it('should validate valid PNG base64', () => {
    const dataUri = 'data:image/png;base64,' + Buffer.from('x').toString('base64')
    expect(validateBase64Image(dataUri).valid).toBe(true)
  })
  it('should reject invalid format', () => {
    expect(validateBase64Image('not-an-image').valid).toBe(false)
    expect(validateBase64Image('').valid).toBe(false)
  })
  it('should reject unsupported image type', () => {
    const dataUri = 'data:image/bmp;base64,' + Buffer.from('x').toString('base64')
    expect(validateBase64Image(dataUri).valid).toBe(false)
  })
})

describe('sanitizeQueryParams', () => {
  it('should filter out null/undefined/empty values', () => {
    const result = sanitizeQueryParams({ a: 'hello', b: null, c: undefined, d: '' })
    expect(result).toEqual({ a: 'hello' })
  })
  it('should convert numbers and booleans to strings', () => {
    const result = sanitizeQueryParams({ page: 1, active: true })
    expect(result).toEqual({ page: '1', active: 'true' })
  })
  it('should trim string values', () => {
    const result = sanitizeQueryParams({ search: '  test  ' })
    expect(result).toEqual({ search: 'test' })
  })
})

describe('validateClientData', () => {
  const schema = z.object({ name: z.string().min(2) })
  it('should return success for valid data', () => {
    const result = validateClientData(schema, { name: 'John' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('John')
  })
  it('should return errors for invalid data', () => {
    const result = validateClientData(schema, { name: 'X' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.errors.length).toBeGreaterThan(0)
  })
})
