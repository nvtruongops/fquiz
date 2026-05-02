import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getSettings } from '@/models/SiteSettings'

// Force nodejs runtime - NOT edge, vì dùng Mongoose
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/public/settings
 * Public endpoint - trả về maintenance_mode để proxy đọc
 * Không cần auth, chỉ trả về thông tin không nhạy cảm
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
        'Cache-Control': 'no-store', // Không cache - cần real-time
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
