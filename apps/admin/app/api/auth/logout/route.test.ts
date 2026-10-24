import { POST } from './route'

describe('POST /api/auth/logout', () => {
  test('clears the current and legacy Admin auth cookies', async () => {
    const response = await POST()
    const expiredCookies = response.cookies.getAll().map(({ name }) => name)

    expect(response.status).toBe(200)
    expect(expiredCookies).toEqual(expect.arrayContaining(['auth-token', 'token']))
  })
})
