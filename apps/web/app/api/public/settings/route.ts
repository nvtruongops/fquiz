import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { getSettings } from '@/lib/modules/auth/models/SiteSettings'

// Force nodejs runtime - NOT edge, because Mongoose is used
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/public/settings
 * Public endpoint - returns maintenance_mode for proxy consumption
 * No auth required, returns only non-sensitive data
 */
export async function GET() {
  try {
    await connectDB()
    const settings = await getSettings()

    return NextResponse.json({
      maintenance_mode: settings.maintenance_mode,
      app_name: settings.app_name,
    }, {
      headers: {
        'Cache-Control': 'no-store', // Do not cache - real-time required
      }
    })
  } catch {
    // Fail safe
    return NextResponse.json({
      maintenance_mode: false,
      app_name: 'FQuiz',
    })
  }
}
