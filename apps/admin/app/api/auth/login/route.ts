import { NextResponse } from 'next/server'
import { checkRateLimit, createRateLimitErrorResponse, RATE_LIMIT_TIERS, verifyPassword } from '@fquiz/auth'
import { connectDB } from '@/lib/db/mongodb'
import { User } from '@/lib/models/User'
import { LoginLog } from '@/lib/models/LoginLog'
import { signAdminToken } from '@/lib/auth/auth'
import { AUTH_COOKIE_NAME, COOKIE_MAX_AGE } from '@/lib/constants'

function isValidTokenVersion(version: unknown): version is number {
  return typeof version === 'number' && Number.isInteger(version) && version >= 1
}

async function findAdminLoginUser(identifier: string) {
  const normalizedIdentifier = String(identifier).trim()
  if (normalizedIdentifier.includes('@')) {
    return User.findOne({ email: normalizedIdentifier.toLowerCase() }).select('+password_hash')
  }
  return User.findOne({
    $or: [
      { username: normalizedIdentifier },
      { username_lower: normalizedIdentifier.toLowerCase() },
    ],
  }).select('+password_hash')
}

function getAdminAccountResponse(user: any): NextResponse | null {
  if (user.status !== 'active') {
    return NextResponse.json({ error: 'Account is not active' }, { status: 403 })
  }
  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Access denied: Only Administrator accounts can access the Admin Portal' },
      { status: 403 }
    )
  }
  return null
}

async function getAdminTokenVersion(user: any): Promise<number | NextResponse> {
  const version = user.token_version
  if (isValidTokenVersion(version)) return version
  const migratedUser = await User.findOneAndUpdate(
    {
      _id: user._id,
      role: 'admin',
      status: 'active',
      token_version: version === undefined ? { $exists: false } : version,
    },
    { $set: { token_version: 2 } },
    { new: true }
  ).select('token_version').lean()
  if (!migratedUser) {
    return NextResponse.json({ error: 'Account changed; try signing in again' }, { status: 409 })
  }
  return migratedUser.token_version
}

async function authenticateAdmin(identifier: string, password: string) {
  await connectDB()
  const user = await findAdminLoginUser(identifier)
  const credentialResponse = await getAdminCredentialResponse(user, password)
  if (credentialResponse) return { response: credentialResponse }

  const tokenVersion = await getAdminTokenVersion(user)
  if (tokenVersion instanceof NextResponse) return { response: tokenVersion }
  return { user, tokenVersion }
}

async function getAdminCredentialResponse(user: any, password: string): Promise<NextResponse | null> {
  if (!user) return getInvalidCredentialsResponse()
  const accountResponse = getAdminAccountResponse(user)
  if (accountResponse) return accountResponse
  return await verifyPassword(password, user.password_hash) ? null : getInvalidCredentialsResponse()
}

function getInvalidCredentialsResponse() {
  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
}

async function recordAdminLogin(user: any, ip: string, userAgent: string) {
  try {
    await LoginLog.create({ user_id: user._id, ip, user_agent: userAgent })
  } catch {
    // Login logging must not prevent authentication.
  }
}

function createAdminLoginResponse(user: any, token: string) {
  const response = NextResponse.json({
    success: true,
    user: {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    },
  })
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
  return response
}

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(request, { ...RATE_LIMIT_TIERS.AUTH_STRICT, keyPrefix: 'rl:admin_login' })
    if (!rateLimit.success) return createRateLimitErrorResponse(rateLimit)

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const body = await request.json().catch(() => ({}))
    const { identifier, password } = body

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Please enter all required fields' }, { status: 400 })
    }

    const authentication = await authenticateAdmin(identifier, password)
    if ('response' in authentication) return authentication.response
    const { user, tokenVersion } = authentication

    await recordAdminLogin(user, ip, userAgent)
    const token = await signAdminToken(
      user._id.toString(),
      user.role,
      tokenVersion,
      { username: user.username, avatarUrl: user.avatar_url ?? undefined }
    )
    return createAdminLoginResponse(user, token)
  } catch (error: any) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
