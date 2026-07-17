import { NextResponse } from 'next/server'

/** POST /api/v1/ai/generate */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ message: 'API v1 AI — Generate endpoint', status: 'skeleton', availableIn: 'Phase 3' })
}
