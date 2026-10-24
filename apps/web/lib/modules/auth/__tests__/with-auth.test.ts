jest.mock('../auth', () => ({ verifyToken: jest.fn() }))

import { NextResponse } from 'next/server'
import { verifyToken } from '../auth'
import { withAuth } from '../with-auth'

describe('Web API authentication wrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('does not downgrade a rejected cookie token to guest access', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(null)
    const handler = jest.fn(async () => NextResponse.json({ ok: true }))
    const request = new Request('https://web.example.test/api/sessions', {
      headers: { cookie: 'auth-token=revoked-token' },
    })

    const response = await withAuth(handler, { roles: ['student'], allowGuest: true })(request, { params: {} })

    expect(response.status).toBe(401)
    expect(handler).not.toHaveBeenCalled()
  })

  test('keeps intentional anonymous guest access when no credential was supplied', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue(null)
    const handler = jest.fn(async (_request: Request, { payload }: any) => NextResponse.json(payload))
    const request = new Request('https://web.example.test/api/sessions')

    const response = await withAuth(handler, { roles: ['student'], allowGuest: true })(request, { params: {} })

    expect(response.status).toBe(200)
    expect(handler).toHaveBeenCalledWith(request, { params: {}, payload: { userId: '', role: 'guest' } })
  })

  test('enforces the requested role hierarchy for verified tokens', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue({ userId: 'user-1', role: 'teacher', v: 1 })
    const handler = jest.fn(async () => NextResponse.json({ ok: true }))
    const request = new Request('https://web.example.test/api/teacher/classrooms')

    const response = await withAuth(handler, { roles: ['student'] })(request, { params: {} })

    expect(response.status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
