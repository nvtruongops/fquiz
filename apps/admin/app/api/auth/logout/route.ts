import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/constants'

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out' })
  response.cookies.delete(AUTH_COOKIE_NAME)
  return response
}
