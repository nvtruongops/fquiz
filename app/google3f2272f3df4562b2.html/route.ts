import { NextResponse } from 'next'

export async function GET() {
  return new NextResponse('google-site-verification: google3f2272f3df4562b2.html', {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
