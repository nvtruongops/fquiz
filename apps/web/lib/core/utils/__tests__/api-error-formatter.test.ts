import { formatApiError, notifyApiError } from '../api-error-formatter'
import { useToast } from '@/store/shared/toast-store'

describe('API Error Formatter', () => {
  beforeEach(() => {
    useToast.getState().clearToasts()
  })

  it('formats network failure errors appropriately', () => {
    const error = new TypeError('Failed to fetch')
    const formatted = formatApiError(error)
    expect(formatted.title).toBe('Connection Lost')
    expect(formatted.type).toBe('error')
  })

  it('formats 429 rate limiting as a warning with actionable copy', () => {
    const error = { status: 429, data: { error: 'Too many requests' } }
    const formatted = formatApiError(error)
    expect(formatted.title).toBe('Too Many Requests')
    expect(formatted.type).toBe('warning')
    expect(formatted.message).toBe('Too many requests')
  })

  it('formats 401 unauthorized session expiry as a warning', () => {
    const error = { status: 401 }
    const formatted = formatApiError(error)
    expect(formatted.title).toBe('Session Expired')
    expect(formatted.type).toBe('warning')
    expect(formatted.message).toContain('Your login session has expired')
  })

  it('formats 500 internal server error cleanly with friendly fallback', () => {
    const error = { status: 500, message: 'Internal Server Error' }
    const formatted = formatApiError(error)
    expect(formatted.title).toBe('Internal Server Error')
    expect(formatted.type).toBe('error')
    expect(formatted.message).toContain('The server encountered an error')
  })

  it('formats 503 service unavailable with maintenance notice', () => {
    const error = { status: 503 }
    const formatted = formatApiError(error)
    expect(formatted.title).toBe('Service Unavailable')
    expect(formatted.type).toBe('error')
    expect(formatted.message).toContain('temporarily unavailable')
  })

  it('notifyApiError dispatches toast accurately to useToast store', () => {
    notifyApiError({ status: 429, error: 'Rate limit hit' })
    const toasts = useToast.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('warning')
    expect(toasts[0].title).toBe('Too Many Requests')
    expect(toasts[0].message).toBe('Rate limit hit')
  })
})
