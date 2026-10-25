import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: '@fquiz/web',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
}
