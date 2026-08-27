import { BrowserContext } from '@playwright/test'
import { SignJWT } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'a10cf8bef2e162baaa8b86a9466b5ed784c5cb54133e3e28460815a55d75ee74'
export const DEFAULT_TEST_USER_ID = '69d7441dff42ce4f938bd488'
export const DEFAULT_TEST_USERNAME = 'examplestudent'
export const DEFAULT_TEST_EMAIL = 'user@example.com'

export const DEFAULT_ADMIN_USER_ID = '69d7441dff42ce4f938bd499'
export const DEFAULT_ADMIN_USERNAME = 'admin_tester'
export const DEFAULT_ADMIN_EMAIL = 'admin@example.com'

export const WEB_APP_URL = process.env.APP_URL || 'http://localhost:3000'
export const ADMIN_APP_URL = process.env.ADMIN_APP_URL || 'http://localhost:3001'

export async function createTestToken(payload: {
  userId?: string
  role?: string
  username?: string
  v?: number
} = {}): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET)
  const userId = payload.userId || DEFAULT_TEST_USER_ID
  const role = payload.role || 'student'
  const v = payload.v ?? 1
  const username = payload.username || (role === 'admin' ? DEFAULT_ADMIN_USERNAME : DEFAULT_TEST_USERNAME)

  return new SignJWT({ userId, role, v, username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)
}

export async function setTestAuthCookie(
  context: BrowserContext,
  options: {
    userId?: string
    role?: string
    username?: string
    baseURL?: string
    v?: number
  } = {}
) {
  const token = await createTestToken(options)
  const url = options.baseURL || WEB_APP_URL

  await context.addCookies([
    {
      name: 'auth-token',
      value: token,
      url,
      httpOnly: false,
      sameSite: 'Lax',
    },
  ])

  return token
}

export async function setAdminAuthCookie(
  context: BrowserContext,
  options: {
    userId?: string
    username?: string
    v?: number
  } = {}
) {
  return setTestAuthCookie(context, {
    userId: options.userId || DEFAULT_ADMIN_USER_ID,
    username: options.username || DEFAULT_ADMIN_USERNAME,
    role: 'admin',
    baseURL: ADMIN_APP_URL,
    v: options.v ?? 1,
  })
}

export async function setStudentAuthCookie(
  context: BrowserContext,
  options: {
    userId?: string
    username?: string
    v?: number
  } = {}
) {
  return setTestAuthCookie(context, {
    userId: options.userId || DEFAULT_TEST_USER_ID,
    username: options.username || DEFAULT_TEST_USERNAME,
    role: 'student',
    baseURL: WEB_APP_URL,
    v: options.v ?? 1,
  })
}
