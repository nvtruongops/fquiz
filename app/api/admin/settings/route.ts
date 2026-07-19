import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifyToken } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { SiteSettings, getSettings, clearSettingsCache } from '@/lib/modules/auth/models/SiteSettings'
import { UpdateSiteSettingsSchema } from '@/lib/modules/auth/schemas/user'
import { encryptSecret, maskApiKey } from '@/lib/core/security/crypto'

export const dynamic = 'force-dynamic'

function sanitizeSettingsForClient(rawSettings: any) {
  const settings = JSON.parse(JSON.stringify(rawSettings))
  if (settings && settings.llm_config) {
    const providers = ['gemini', 'openai', 'custom'] as const
    for (const provider of providers) {
      if (settings.llm_config[provider]) {
        const key = settings.llm_config[provider].apiKey || ''
        settings.llm_config[provider].hasApiKey = Boolean(key)
        settings.llm_config[provider].apiKeyMasked = maskApiKey(key)
        settings.llm_config[provider].apiKey = '' // Never return plain-text or encrypted key to client
      }
    }
  }
  return settings
}

/** GET — Retrieve current site settings (auto-creates default if none exist) */
export const GET = withAuth(async (req: Request, { payload }) => {
  try {
    await connectDB()
    const rawSettings = await getSettings()
    const settings = sanitizeSettingsForClient(rawSettings)

    // Sync maintenance-mode cookie với DB state khi GET
    const response = NextResponse.json({ settings })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    if (rawSettings.maintenance_mode) {
      response.cookies.set('maintenance-mode', '1', {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30,
      })
    } else {
      response.cookies.delete('maintenance-mode')
    }
    return response
  } catch (err) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}, { roles: ['admin'] })

/** PUT — Update site settings */
export const PUT = withAuth(async (req: Request, { payload }) => {
  try {
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

    // Ensure singleton exists
    const existing = await getSettings()

    // Build updates map
    const updates: Record<string, any> = {}
    Object.entries(parsed.data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates[key] = value
      }
    })

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Handle LLM Config API Key encryption & overwrite preservation
    if (updates.llm_config) {
      const mergedLlmConfig = {
        ...(existing.llm_config || {}),
        ...updates.llm_config,
      }

      const providers = ['gemini', 'openai', 'custom'] as const
      for (const provider of providers) {
        const submittedProviderObj = updates.llm_config[provider]
        const existingProviderObj = (existing.llm_config as any)?.[provider] || {}

        if (submittedProviderObj) {
          const submittedKey = (submittedProviderObj.apiKey || '').trim()
          const existingKey = existingProviderObj.apiKey || ''

          if (submittedKey && !submittedKey.startsWith('••••')) {
            // Admin entered a new key -> Encrypt and save
            mergedLlmConfig[provider].apiKey = encryptSecret(submittedKey)
          } else {
            // Admin left key blank or kept placeholder mask -> Retain existing encrypted key in DB
            mergedLlmConfig[provider].apiKey = existingKey
          }
        } else if (existingProviderObj) {
          mergedLlmConfig[provider] = { ...existingProviderObj }
        }
      }

      updates.llm_config = mergedLlmConfig
    }

    // Use MongoDB native driver via Mongoose collection
    const collection = SiteSettings.collection
    await collection.updateOne(
      { _id: existing._id },
      { $set: updates }
    )
    const updatedRaw = await collection.findOne({ _id: existing._id })

    clearSettingsCache()

    const settings = sanitizeSettingsForClient(updatedRaw)
    const response = NextResponse.json({ settings })
    if ('maintenance_mode' in updates) {
      if (updates.maintenance_mode === true) {
        response.cookies.set('maintenance-mode', '1', {
          path: '/',
          httpOnly: false,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 30,
        })
      } else {
        response.cookies.delete('maintenance-mode')
      }
    }

    return response
  } catch (err) {
    console.error('Error updating settings:', err)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}, { roles: ['admin'] })