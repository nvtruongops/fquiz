import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out' })
  const authCookieDomain = process.env.AUTH_COOKIE_DOMAIN

  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
    ...(authCookieDomain ? { domain: authCookieDomain } : {}),
  })
  return response
}
