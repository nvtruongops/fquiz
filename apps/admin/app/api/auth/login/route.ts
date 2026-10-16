import { NextResponse } from 'next/server'
import { verifyPassword } from '@fquiz/auth'
import { connectDB } from '@/lib/db/mongodb'
import { User } from '@/lib/models/User'
import { LoginLog } from '@/lib/models/LoginLog'
import { signAdminToken } from '@/lib/auth/auth'
import { AUTH_COOKIE_NAME, COOKIE_MAX_AGE } from '@/lib/constants'

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const body = await request.json().catch(() => ({}))
    const { identifier, password } = body

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Please enter all required fields' }, { status: 400 })
    }

    await connectDB()

    const isEmail = String(identifier).includes('@')
    const user = isEmail
      ? await User.findOne({ email: String(identifier).toLowerCase().trim() }).select('+password_hash')
      : await User.findOne({
          $or: [
            { username: String(identifier).trim() },
            { username_lower: String(identifier).toLowerCase().trim() },
          ],
        }).select('+password_hash')

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (user.status === 'banned') {
      return NextResponse.json({ error: 'Account has been suspended' }, { status: 403 })
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied: Only Administrator accounts can access the Admin Portal' },
        { status: 403 }
      )
    }

    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Record login log
    try {
      await LoginLog.create({
        user_id: user._id,
        ip,
        user_agent: userAgent,
      })
    } catch {
      // Non-blocking log
    }

    const token = await signAdminToken(
      user._id.toString(),
      user.role,
      user.token_version || 1,
      { username: user.username, avatarUrl: user.avatar_url ?? undefined }
    )

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
      },
    })

    const isProduction = process.env.NODE_ENV === 'production'

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Admin login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
