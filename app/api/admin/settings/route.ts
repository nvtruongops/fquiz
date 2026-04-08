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
    return NextResponse.json({ settings })
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

    return NextResponse.json({ settings })
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
