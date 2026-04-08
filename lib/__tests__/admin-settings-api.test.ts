/**
 * Unit tests for Admin Settings API routes
 * Coverage: GET (auto-create default), PUT (update fields)
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/logger', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  logSecurityEvent: jest.fn(),
  logRateLimitTriggered: jest.fn(),
  logJWTVerificationFailed: jest.fn(),
  logSessionError: jest.fn(),
}))
jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(),
  requireRole: jest.fn(),
}))

const mockFindOne = jest.fn()
const mockCreate = jest.fn()
const mockFindByIdAndUpdate = jest.fn()

jest.mock('@/models/SiteSettings', () => {
  return {
    SiteSettings: {
      findOne: (...args: unknown[]) => mockFindOne(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      findByIdAndUpdate: (...args: unknown[]) => mockFindByIdAndUpdate(...args),
    },
    getSettings: jest.fn(),
  }
})

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { GET as getSettingsHandler, PUT as putSettingsHandler } from '@/app/api/admin/settings/route'
import { verifyToken, requireRole } from '@/lib/auth'
import { getSettings } from '@/models/SiteSettings'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockAdminPayload = { userId: 'admin-user-id', role: 'admin' as const, iat: 0, exp: 9999999999 }

const defaultSettings = {
  _id: 'settings-id',
  app_name: 'FQuiz Platform',
  app_description: 'Nền tảng ôn tập thông minh trực tuyến',
  allow_registration: true,
  maintenance_mode: false,
  anti_sharing_enabled: false,
  anti_sharing_max_violations: 10,
}

function makeRequest(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid-token' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  ;(verifyToken as jest.Mock).mockResolvedValue(mockAdminPayload)
  ;(requireRole as jest.Mock).mockReturnValue(undefined)
  ;(getSettings as jest.Mock).mockResolvedValue(defaultSettings)
})

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/admin/settings
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/admin/settings', () => {
  it('returns 401 when unauthenticated', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(null)
    const req = makeRequest('GET', 'http://localhost/api/admin/settings')
    const res = await getSettingsHandler(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is not admin', async () => {
    ;(requireRole as jest.Mock).mockImplementation(() => {
      throw new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    })
    const req = makeRequest('GET', 'http://localhost/api/admin/settings')
    const res = await getSettingsHandler(req)
    expect(res.status).toBe(403)
  })

  it('returns default settings with 200', async () => {
    const req = makeRequest('GET', 'http://localhost/api/admin/settings')
    const res = await getSettingsHandler(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.settings).toEqual(defaultSettings)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// PUT /api/admin/settings
// ═════════════════════════════════════════════════════════════════════════════

describe('PUT /api/admin/settings', () => {
  it('returns 401 when unauthenticated', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(null)
    const req = makeRequest('PUT', 'http://localhost/api/admin/settings', { app_name: 'New' })
    const res = await putSettingsHandler(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when no valid fields provided', async () => {
    const req = makeRequest('PUT', 'http://localhost/api/admin/settings', { invalid_field: 'x' })
    const res = await putSettingsHandler(req)
    expect(res.status).toBe(400)
  })

  it('updates app_name and returns 200', async () => {
    const updatedSettings = { ...defaultSettings, app_name: 'New Name' }
    mockFindByIdAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue(updatedSettings),
    })

    const req = makeRequest('PUT', 'http://localhost/api/admin/settings', { app_name: 'New Name' })
    const res = await putSettingsHandler(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.settings.app_name).toBe('New Name')
  })

  it('updates anti_sharing_enabled and returns 200', async () => {
    const updatedSettings = { ...defaultSettings, anti_sharing_enabled: true }
    mockFindByIdAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue(updatedSettings),
    })

    const req = makeRequest('PUT', 'http://localhost/api/admin/settings', { anti_sharing_enabled: true })
    const res = await putSettingsHandler(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.settings.anti_sharing_enabled).toBe(true)
  })

  it('ignores non-whitelisted fields', async () => {
    const updatedSettings = { ...defaultSettings, app_name: 'Test' }
    mockFindByIdAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue(updatedSettings),
    })

    const req = makeRequest('PUT', 'http://localhost/api/admin/settings', {
      app_name: 'Test',
      hacked_field: 'evil',
    })
    const res = await putSettingsHandler(req)
    expect(res.status).toBe(200)
    // Verify only whitelisted fields were passed to the update
    const updateCall = mockFindByIdAndUpdate.mock.calls[0]
    expect(updateCall[1].$set).not.toHaveProperty('hacked_field')
  })
})
