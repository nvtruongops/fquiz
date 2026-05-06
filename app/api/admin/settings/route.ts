import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken, requireRole } from '@/lib/auth'
import { SiteSettings, getSettings } from '@/models/SiteSettings'
import { UpdateSiteSettingsSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

/** GET — Retrieve current site settings (auto-creates default if none exist) */
export async function GET(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requireRole(payload, 'admin')

    await connectDB()
    const settings = await getSettings()

    // Sync maintenance-mode cookie với DB state khi GET
    // Chỉ set cookie khi maintenance đang BẬT (để proxy dùng fast path).
    // Khi maintenance TẮT: xóa cookie → proxy sẽ fallback về API check,
    // đảm bảo user không bị "stuck" với cookie cũ khi admin bật maintenance.
    const response = NextResponse.json({ settings })
    if (settings.maintenance_mode) {
      response.cookies.set('maintenance-mode', '1', {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30, // 30 giây - ngắn để tự expire khi admin tắt
      })
    } else {
      // Xóa cookie khi maintenance tắt
      response.cookies.delete('maintenance-mode')
    }
    return response
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}

/** PUT — Update site settings */
export async function PUT(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requireRole(payload, 'admin')

    await connectDB()
    
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Validate with schema
    const parsed = UpdateSiteSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    // Only update fields that were provided
    const updates: Record<string, unknown> = {}
    Object.entries(parsed.data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates[key] = value
      }
    })

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Ensure singleton exists
    const existing = await getSettings()

    const settings = await SiteSettings.findByIdAndUpdate(
      existing._id,
      { $set: updates },
      { new: true }
    ).lean()

    // Sync maintenance-mode cookie với DB state
    // Chỉ set cookie khi maintenance BẬT (fast path cho proxy).
    // Khi tắt: xóa cookie → proxy fallback về API check,
    // tránh user giữ cookie '0' cũ bypass maintenance khi admin bật lại.
    const response = NextResponse.json({ settings })
    if ('maintenance_mode' in updates) {
      if (updates.maintenance_mode === true) {
        response.cookies.set('maintenance-mode', '1', {
          path: '/',
          httpOnly: false,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 30, // 30 giây - ngắn để tự expire
        })
      } else {
        // Xóa cookie khi tắt maintenance
        response.cookies.delete('maintenance-mode')
      }
    }

    return response
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
